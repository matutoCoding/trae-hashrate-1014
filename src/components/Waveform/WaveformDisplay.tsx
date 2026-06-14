import React, { useEffect, useRef, useCallback } from 'react';
import { AudioAnalysisResult } from '@/types';
import { COLORS } from '@/utils/constants';
import { formatTime } from '@/algorithm/core';

interface WaveformDisplayProps {
  analysisResult: AudioAnalysisResult | null;
  currentTime: number;
  onSeek?: (time: number) => void;
  height?: number;
  showBeats?: boolean;
  showFrequencyBands?: boolean;
  showSections?: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  analysisResult,
  currentTime,
  onSeek,
  height = 200,
  showBeats = true,
  showFrequencyBands = true,
  showSections = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(0, 0, width, height);

    if (!analysisResult) {
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '12px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('请先导入音乐文件', width / 2, height / 2);
      return;
    }

    const { waveformData, duration, beatTimes, downbeatTimes, frequencyBands, sections } = analysisResult;

    if (showSections) {
      sections.forEach((section) => {
        const startX = (section.startTime / duration) * width;
        const endX = (section.endTime / duration) * width;
        const sectionWidth = endX - startX;

        const colors: Record<string, string> = {
          intro: 'rgba(138, 156, 179, 0.15)',
          verse: 'rgba(0, 240, 255, 0.1)',
          chorus: 'rgba(255, 107, 53, 0.15)',
          bridge: 'rgba(0, 210, 106, 0.1)',
          outro: 'rgba(255, 217, 61, 0.1)',
        };

        ctx.fillStyle = colors[section.type] || 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(startX, 0, sectionWidth, height);

        const sectionNames: Record<string, string> = {
          intro: '前奏',
          verse: '主歌',
          chorus: '副歌',
          bridge: '桥段',
          outro: '尾声',
        };

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(sectionNames[section.type], startX + 8, 16);
      });
    }

    if (showFrequencyBands) {
      const bandHeight = 30;
      const bandY = height - bandHeight - 10;

      const drawBand = (data: number[], color: string, yOffset: number) => {
        ctx.beginPath();
        ctx.moveTo(0, bandY + bandHeight + yOffset);
        for (let i = 0; i < data.length; i++) {
          const x = (i / data.length) * width;
          const value = data[i];
          const y = bandY + bandHeight + yOffset - value * bandHeight;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, bandY + bandHeight + yOffset);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };

      drawBand(frequencyBands.low, 'rgba(255, 107, 53, 0.3)', 0);
      drawBand(frequencyBands.mid, 'rgba(0, 240, 255, 0.3)', -10);
      drawBand(frequencyBands.high, 'rgba(0, 210, 106, 0.3)', -20);
    }

    const centerY = height / 2;
    const amplitude = (height - (showFrequencyBands ? 80 : 20)) / 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width;
      const y = centerY + waveformData[i] * amplitude;
      ctx.lineTo(x, y);
    }

    for (let i = waveformData.length - 1; i >= 0; i--) {
      const x = (i / waveformData.length) * width;
      const y = centerY - waveformData[i] * amplitude;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width;
      const y = centerY + waveformData[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width;
      const y = centerY - waveformData[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (showBeats) {
      beatTimes.forEach((beat) => {
        const x = (beat / duration) * width;
        ctx.strokeStyle = 'rgba(138, 156, 179, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, centerY - amplitude * 0.5);
        ctx.lineTo(x, centerY + amplitude * 0.5);
        ctx.stroke();
      });

      downbeatTimes.forEach((beat) => {
        const x = (beat / duration) * width;
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, centerY - amplitude * 0.8);
        ctx.lineTo(x, centerY + amplitude * 0.8);
        ctx.stroke();

        ctx.fillStyle = COLORS.accent;
        ctx.beginPath();
        ctx.arc(x, centerY - amplitude * 0.8 - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = COLORS.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = COLORS.warning;
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.warning;
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(formatTime(currentTime), playheadX + 8, 22);

    const timeInterval = Math.ceil(duration / 60000) * 10000;
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    for (let t = 0; t <= duration; t += timeInterval) {
      const x = (t / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, height - 20);
      ctx.lineTo(x, height - 14);
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillText(formatTime(t), x, height - 4);
    }
  }, [analysisResult, currentTime, height, showBeats, showFrequencyBands, showSections]);

  useEffect(() => {
    draw();

    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!analysisResult || !onSeek) return;
    isDraggingRef.current = true;
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !analysisResult || !onSeek) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * analysisResult.duration;
    onSeek(Math.max(0, Math.min(time, analysisResult.duration)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (isDraggingRef.current) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove as any);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, [isDraggingRef.current]);

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-lg border border-industrial-border bg-industrial-bg"
    >
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        onMouseDown={handleMouseDown}
      />
      {showFrequencyBands && analysisResult && (
        <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 rounded bg-warning/50" />
            <span className="text-warning">低频</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 rounded bg-accent/50" />
            <span className="text-accent">中频</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 rounded bg-success/50" />
            <span className="text-success">高频</span>
          </div>
        </div>
      )}
    </div>
  );
};
