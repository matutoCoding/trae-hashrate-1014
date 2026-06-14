import { AudioAnalysisResult, MusicSection } from '../types';
import { generateId } from './core';

export const analyzeAudioFile = async (file: File): Promise<AudioAnalysisResult> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration * 1000;

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const waveformData = extractWaveform(channelData, 2000);
    const { bpm, beatTimes, downbeatTimes } = detectBeats(channelData, sampleRate, duration);
    const frequencyBands = analyzeFrequencyBands(audioBuffer);
    const sections = detectSections(audioBuffer, frequencyBands, bpm, beatTimes);

    return {
      duration: Math.round(duration),
      bpm,
      beatTimes,
      downbeatTimes,
      frequencyBands,
      sections,
      waveformData,
    };
  } finally {
    audioContext.close();
  }
};

const extractWaveform = (channelData: Float32Array, targetSamples: number): number[] => {
  const blockSize = Math.floor(channelData.length / targetSamples);
  const waveform: number[] = [];

  for (let i = 0; i < targetSamples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let max = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }

    waveform.push(max);
  }

  return waveform;
};

const detectBeats = (
  channelData: Float32Array,
  sampleRate: number,
  duration: number
): { bpm: number; beatTimes: number[]; downbeatTimes: number[] } => {
  const windowSize = Math.floor(sampleRate * 0.01);
  const hopSize = Math.floor(sampleRate * 0.005);
  const energyHistory: number[] = [];

  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    energyHistory.push(energy / windowSize);
  }

  const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
  const threshold = avgEnergy * 1.3;

  const beatIndices: number[] = [];
  let lastBeatIndex = -10;
  const minBeatInterval = 20;

  for (let i = 0; i < energyHistory.length; i++) {
    if (energyHistory[i] > threshold && i - lastBeatIndex > minBeatInterval) {
      if (i > 0 && i < energyHistory.length - 1) {
        if (energyHistory[i] >= energyHistory[i - 1] && energyHistory[i] >= energyHistory[i + 1]) {
          beatIndices.push(i);
          lastBeatIndex = i;
        }
      }
    }
  }

  const beatTimes = beatIndices.map(i => Math.round((i * hopSize / sampleRate) * 1000));

  const intervals: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    const interval = beatTimes[i] - beatTimes[i - 1];
    if (interval > 200 && interval < 2000) {
      intervals.push(interval);
    }
  }

  let bpm = 120;
  if (intervals.length > 0) {
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    bpm = Math.round(60000 / median);

    if (bpm < 60) bpm *= 2;
    if (bpm > 180) bpm = Math.round(bpm / 2);
  }

  const downbeatTimes: number[] = [];
  for (let i = 0; i < beatTimes.length; i += 4) {
    downbeatTimes.push(beatTimes[i]);
  }

  const regularBeatTimes: number[] = [];
  if (beatTimes.length > 2) {
    const beatInterval = 60000 / bpm;
    let currentTime = beatTimes[0];
    while (currentTime < duration) {
      regularBeatTimes.push(Math.round(currentTime));
      currentTime += beatInterval;
    }
  }

  return {
    bpm,
    beatTimes: regularBeatTimes.length > beatTimes.length ? regularBeatTimes : beatTimes,
    downbeatTimes,
  };
};

const analyzeFrequencyBands = (audioBuffer: AudioBuffer): { low: number[]; mid: number[]; high: number[] } => {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  const samplesPerSecond = 1;
  const totalSamples = Math.ceil(duration * samplesPerSecond);
  const windowSize = Math.floor(sampleRate / samplesPerSecond);

  const lowBand: number[] = [];
  const midBand: number[] = [];
  const highBand: number[] = [];

  const lowFreq = 250;
  const midFreq = 2000;

  const lowBin = Math.floor(lowFreq * windowSize / sampleRate);
  const midBin = Math.floor(midFreq * windowSize / sampleRate);
  const highBin = Math.floor((sampleRate / 2) * windowSize / sampleRate);

  const real = new Float32Array(windowSize);
  const imag = new Float32Array(windowSize);

  for (let i = 0; i < totalSamples; i++) {
    const start = Math.min(i * windowSize, channelData.length - windowSize);
    for (let j = 0; j < windowSize; j++) {
      real[j] = channelData[start + j] * (0.5 - 0.5 * Math.cos(2 * Math.PI * j / windowSize));
      imag[j] = 0;
    }

    const magnitudes = computeFFTMagnitudes(real, imag, windowSize);

    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    for (let k = 0; k < lowBin && k < magnitudes.length; k++) {
      lowEnergy += magnitudes[k];
    }
    for (let k = lowBin; k < midBin && k < magnitudes.length; k++) {
      midEnergy += magnitudes[k];
    }
    for (let k = midBin; k < highBin && k < magnitudes.length; k++) {
      highEnergy += magnitudes[k];
    }

    lowBand.push(Math.min(1, lowEnergy / (lowBin * 10)));
    midBand.push(Math.min(1, midEnergy / ((midBin - lowBin) * 10)));
    highBand.push(Math.min(1, highEnergy / ((highBin - midBin) * 10)));
  }

  return { low: lowBand, mid: midBand, high: highBand };
};

const computeFFTMagnitudes = (real: Float32Array, imag: Float32Array, size: number): Float32Array => {
  const n = size;
  const realCopy = new Float32Array(real);
  const imagCopy = new Float32Array(imag);

  const bits = Math.ceil(Math.log2(n));
  const n2 = 1 << bits;

  const reversed = new Uint32Array(n2);
  for (let i = 0; i < n2; i++) {
    reversed[i] = 0;
    for (let j = 0; j < bits; j++) {
      if (i & (1 << j)) {
        reversed[i] |= 1 << (bits - 1 - j);
      }
    }
  }

  const realPadded = new Float32Array(n2);
  const imagPadded = new Float32Array(n2);
  for (let i = 0; i < n; i++) {
    realPadded[reversed[i]] = realCopy[i];
    imagPadded[reversed[i]] = imagCopy[i];
  }

  for (let s = 1; s <= bits; s++) {
    const m = 1 << s;
    const m2 = m >> 1;
    const wReal = Math.cos(2 * Math.PI / m);
    const wImag = -Math.sin(2 * Math.PI / m);

    for (let k = 0; k < n2; k += m) {
      let wR = 1;
      let wI = 0;

      for (let j = 0; j < m2; j++) {
        const tR = wR * realPadded[k + j + m2] - wI * imagPadded[k + j + m2];
        const tI = wR * imagPadded[k + j + m2] + wI * realPadded[k + j + m2];
        const uR = realPadded[k + j];
        const uI = imagPadded[k + j];

        realPadded[k + j] = uR + tR;
        imagPadded[k + j] = uI + tI;
        realPadded[k + j + m2] = uR - tR;
        imagPadded[k + j + m2] = uI - tI;

        const wRNew = wR * wReal - wI * wImag;
        const wINew = wR * wImag + wI * wReal;
        wR = wRNew;
        wI = wINew;
      }
    }
  }

  const magnitudes = new Float32Array(n2 / 2);
  for (let i = 0; i < n2 / 2; i++) {
    magnitudes[i] = Math.sqrt(realPadded[i] * realPadded[i] + imagPadded[i] * imagPadded[i]);
  }

  return magnitudes;
};

const detectSections = (
  audioBuffer: AudioBuffer,
  frequencyBands: { low: number[]; mid: number[]; high: number[] },
  bpm: number,
  beatTimes: number[]
): MusicSection[] => {
  const duration = audioBuffer.duration * 1000;
  const { low, mid, high } = frequencyBands;
  const totalSamples = low.length;

  const energyCurve: number[] = [];
  for (let i = 0; i < totalSamples; i++) {
    energyCurve.push(low[i] * 0.5 + mid[i] * 0.3 + high[i] * 0.2);
  }

  const avgEnergy = energyCurve.reduce((a, b) => a + b, 0) / totalSamples;
  const maxEnergy = Math.max(...energyCurve);

  const sectionSize = Math.max(1, Math.floor(totalSamples / 8));
  const sections: MusicSection[] = [];
  let currentTime = 0;

  const sectionPattern: MusicSection['type'][] = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
  const sectionDurations = [15, 30, 25, 30, 25, 15, 30, 10];

  const totalPatternDuration = sectionDurations.reduce((a, b) => a + b, 0);
  const scale = (duration / 1000) / totalPatternDuration;

  for (let i = 0; i < sectionPattern.length; i++) {
    const sectionDuration = sectionDurations[i] * scale * 1000;
    if (currentTime >= duration) break;

    const endTime = Math.min(currentTime + sectionDuration, duration);

    const startIdx = Math.floor(currentTime / 1000);
    const endIdx = Math.min(Math.floor(endTime / 1000), totalSamples - 1);
    let sectionEnergy = 0;
    for (let j = startIdx; j <= endIdx; j++) {
      sectionEnergy += energyCurve[j];
    }
    const avgSectionEnergy = sectionEnergy / (endIdx - startIdx + 1);

    const intensity = Math.min(1, Math.max(0.2, avgSectionEnergy / maxEnergy * 1.5));

    sections.push({
      id: generateId('section'),
      type: sectionPattern[i],
      startTime: Math.round(currentTime),
      endTime: Math.round(endTime),
      intensity,
    });

    currentTime = endTime;
  }

  return sections;
};

export const generateMockAnalysis = (duration: number = 180000): AudioAnalysisResult => {
  const bpm = 120;
  const beatInterval = 60000 / bpm;
  const beatTimes: number[] = [];
  const downbeatTimes: number[] = [];

  for (let t = beatInterval; t < duration; t += beatInterval) {
    beatTimes.push(Math.round(t));
    if (beatTimes.length % 4 === 1) {
      downbeatTimes.push(Math.round(t));
    }
  }

  const sampleCount = Math.ceil(duration / 1000);
  const generateBandData = (baseAmp: number, variance: number): number[] => {
    const data: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;
      const base = baseAmp + Math.sin(t * Math.PI * 4) * variance * 0.3;
      const chorusBoost = isInChorus(t, duration) ? variance * 0.4 : 0;
      const wave = Math.sin(t * Math.PI * 8) * variance * 0.2;
      data.push(Math.max(0, Math.min(1, base + chorusBoost + wave)));
    }
    return data;
  };

  const lowBand = generateBandData(0.3, 0.5);
  const midBand = generateBandData(0.4, 0.4);
  const highBand = generateBandData(0.2, 0.3);

  const waveformData: number[] = [];
  const waveformSamples = 2000;
  for (let i = 0; i < waveformSamples; i++) {
    const t = i / waveformSamples;
    const base = Math.sin(t * Math.PI * 20) * 0.3;
    const detail = Math.sin(t * Math.PI * 200) * 0.1;
    const chorus = isInChorus(t, duration) ? 0.2 : 0;
    waveformData.push(Math.abs(base + detail + chorus));
  }

  const sections = generateSections(duration);

  return {
    duration,
    bpm,
    beatTimes,
    downbeatTimes,
    frequencyBands: {
      low: lowBand,
      mid: midBand,
      high: highBand,
    },
    sections,
    waveformData,
  };
};

const isInChorus = (normalizedTime: number, duration: number): boolean => {
  const sections = generateSections(duration);
  const time = normalizedTime * duration;
  return sections.some(s => s.type === 'chorus' && time >= s.startTime && time <= s.endTime);
};

export const generateSections = (duration: number): MusicSection[] => {
  const sections: MusicSection[] = [];
  const sectionPattern: { type: MusicSection['type']; duration: number }[] = [
    { type: 'intro', duration: 15000 },
    { type: 'verse', duration: 30000 },
    { type: 'chorus', duration: 25000 },
    { type: 'verse', duration: 30000 },
    { type: 'chorus', duration: 25000 },
    { type: 'bridge', duration: 15000 },
    { type: 'chorus', duration: 30000 },
    { type: 'outro', duration: 10000 },
  ];

  let currentTime = 0;
  sectionPattern.forEach((pattern, index) => {
    if (currentTime >= duration) return;

    const sectionDuration = Math.min(pattern.duration, duration - currentTime);
    sections.push({
      id: generateId('section'),
      type: pattern.type,
      startTime: currentTime,
      endTime: currentTime + sectionDuration,
      intensity: getSectionIntensity(pattern.type, index, sectionPattern.length),
    });

    currentTime += sectionDuration;
  });

  return sections;
};

const getSectionIntensity = (
  type: MusicSection['type'],
  index: number,
  total: number
): number => {
  const baseIntensity: Record<MusicSection['type'], number> = {
    intro: 0.3,
    verse: 0.5,
    chorus: 0.9,
    bridge: 0.7,
    outro: 0.4,
  };

  const progress = index / total;
  const buildUp = progress * 0.2;

  return Math.min(1, baseIntensity[type] + buildUp);
};

export const getSectionTypeName = (type: MusicSection['type']): string => {
  const names: Record<MusicSection['type'], string> = {
    intro: '前奏',
    verse: '主歌',
    chorus: '副歌',
    bridge: '桥段',
    outro: '尾声',
  };
  return names[type];
};

export const getSectionTypeColor = (type: MusicSection['type']): string => {
  const colors: Record<MusicSection['type'], string> = {
    intro: '#8A9CB3',
    verse: '#00F0FF',
    chorus: '#FF6B35',
    bridge: '#00D26A',
    outro: '#FFD93D',
  };
  return colors[type];
};

export const getEnergyAtTime = (
  analysis: AudioAnalysisResult,
  time: number
): { low: number; mid: number; high: number; total: number } => {
  const index = Math.floor(time / 1000);
  const clampedIndex = Math.max(0, Math.min(analysis.frequencyBands.low.length - 1, index));
  const low = analysis.frequencyBands.low[clampedIndex] || 0;
  const mid = analysis.frequencyBands.mid[clampedIndex] || 0;
  const high = analysis.frequencyBands.high[clampedIndex] || 0;

  return {
    low,
    mid,
    high,
    total: (low * 0.5 + mid * 0.3 + high * 0.2),
  };
};

export const getBeatsInRange = (
  analysis: AudioAnalysisResult,
  startTime: number,
  endTime: number
): number[] => {
  return analysis.beatTimes.filter(t => t >= startTime && t <= endTime);
};

export const getSectionAtTime = (
  analysis: AudioAnalysisResult,
  time: number
): MusicSection | undefined => {
  return analysis.sections.find(
    s => time >= s.startTime && time <= s.endTime
  );
};

export const getDominantFrequencyBand = (
  analysis: AudioAnalysisResult,
  time: number
): 'low' | 'mid' | 'high' => {
  const energy = getEnergyAtTime(analysis, time);
  if (energy.low >= energy.mid && energy.low >= energy.high) return 'low';
  if (energy.mid >= energy.low && energy.mid >= energy.high) return 'mid';
  return 'high';
};

export const computeFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
