import { AudioAnalysisResult, MusicSection } from '../types';
import { generateId } from './core';

export const generateMockAnalysis = (duration: number = 180000): AudioAnalysisResult => {
  const bpm = 100 + Math.floor(Math.random() * 40);
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
      const noise = Math.random() * variance;
      const chorusBoost = isInChorus(t, duration) ? variance * 0.4 : 0;
      data.push(Math.max(0, Math.min(1, base + noise + chorusBoost)));
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
    const noise = (Math.random() - 0.5) * 0.2;
    waveformData.push(base + detail + chorus + noise);
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

export const analyzeAudioFile = async (file: File): Promise<AudioAnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockDuration = 180000 + Math.random() * 120000;
      resolve(generateMockAnalysis(mockDuration));
    }, 1500);
  });
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
  const low = analysis.frequencyBands.low[index] || 0;
  const mid = analysis.frequencyBands.mid[index] || 0;
  const high = analysis.frequencyBands.high[index] || 0;

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
