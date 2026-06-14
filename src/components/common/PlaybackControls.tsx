import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, Settings } from 'lucide-react';
import { PlaybackState } from '@/types';
import { formatTime } from '@/algorithm/core';
import { cn } from '@/utils/helpers';

interface PlaybackControlsProps {
  playback: PlaybackState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onReset: () => void;
  onSkipForward?: () => void;
  onSpeedChange?: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleLoop?: () => void;
  disabled?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playback,
  onPlayPause,
  onSeek,
  onReset,
  onSkipForward,
  onSpeedChange,
  onVolumeChange,
  onToggleLoop,
  disabled = false,
}) => {
  const { isPlaying, currentTime, duration, speed, loop, volume } = playback;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleProgressClick(e);
  };

  const speeds = [0.25, 0.5, 0.75, 1, 1.5, 2];

  return (
    <div className="bg-industrial-panel border-t border-industrial-border p-4">
      <div className="mb-3">
        <div
          className={cn(
            'h-2 bg-industrial-bg rounded-full cursor-pointer overflow-hidden border border-industrial-border',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={handleProgressClick}
          onMouseMove={handleProgressDrag}
        >
          <div
            className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-glow" />
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-xs text-industrial-muted">{formatTime(currentTime)}</span>
          <span className="font-mono text-xs text-industrial-muted">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLoop?.()}
            className={cn(
              'p-2 rounded-md transition-colors',
              loop ? 'bg-accent/20 text-accent' : 'text-industrial-muted hover:text-industrial-text'
            )}
            disabled={disabled}
          >
            <Repeat className="w-4 h-4" />
          </button>

          <div className="relative group">
            <button className="p-2 rounded-md text-industrial-muted hover:text-industrial-text transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-industrial-panel border border-industrial-border rounded-lg p-3 min-w-[120px] z-10">
              <p className="text-[10px] text-industrial-muted uppercase tracking-wider mb-2">播放速度</p>
              <div className="flex flex-wrap gap-1">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange?.(s)}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-colors',
                      speed === s
                        ? 'bg-accent/20 text-accent'
                        : 'text-industrial-muted hover:bg-industrial-border hover:text-industrial-text'
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-industrial-muted" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 bg-industrial-bg rounded-full appearance-none cursor-pointer accent-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="industrial-button p-2"
            disabled={disabled}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className={cn(
              'industrial-button-primary flex items-center gap-2 px-6 py-2.5',
              isPlaying ? 'border-warning/50 text-warning hover:bg-warning/10 hover:shadow-glow-warning' : ''
            )}
            disabled={disabled}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span className="text-sm">{isPlaying ? '暂停' : '播放'}</span>
          </button>

          <button
            onClick={onSkipForward}
            className="industrial-button p-2"
            disabled={disabled}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-display text-lg text-accent glow-text">{speed}x</p>
            <p className="text-[10px] text-industrial-muted">播放速度</p>
          </div>
        </div>
      </div>
    </div>
  );
};
