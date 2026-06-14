import React from 'react';
import { GaugeData } from '@/types';
import { cn } from '@/utils/helpers';

interface GaugeProps {
  data: GaugeData;
  size?: number;
  showLabel?: boolean;
  showValue?: boolean;
}

export const Gauge: React.FC<GaugeProps> = ({
  data,
  size = 120,
  showLabel = true,
  showValue = true,
}) => {
  const { value, max, min, label, unit, color } = data;
  const percentage = (value - min) / (max - min);
  const clampedPercentage = Math.max(0, Math.min(1, percentage));

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcAngle = 240;
  const arcLength = (arcAngle / 360) * circumference;
  const offset = arcLength * (1 - clampedPercentage);
  const startAngle = -120;

  const getStatusColor = () => {
    if (clampedPercentage > 0.9) return '#FF3B30';
    if (clampedPercentage > 0.75) return '#FF6B35';
    return color;
  };

  const displayColor = getStatusColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1A2942"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={displayColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
            className="transition-all duration-500"
            style={{
              filter: clampedPercentage > 0.75 ? `drop-shadow(0 0 8px ${displayColor})` : 'none',
            }}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius * 0.1}
            fill={displayColor}
            className="transition-colors duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <>
              <span
                className="font-display text-2xl font-bold glow-text"
                style={{ color: displayColor }}
              >
                {Math.round(value)}
              </span>
              <span className="text-[10px] text-industrial-muted">{unit}</span>
            </>
          )}
        </div>
        {showLabel && (
          <div className="absolute -bottom-1 left-0 right-0 text-center">
            <span className="text-[10px] text-industrial-muted uppercase tracking-wider">
              {label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface BarGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  showPeak?: boolean;
  peakValue?: number;
}

export const BarGauge: React.FC<BarGaugeProps> = ({
  value,
  max,
  label,
  unit = '',
  color = '#00F0FF',
  showPeak = false,
  peakValue,
}) => {
  const percentage = (value / max) * 100;
  const peakPercentage = peakValue ? (peakValue / max) * 100 : 0;

  const getStatusColor = () => {
    if (percentage > 90) return '#FF3B30';
    if (percentage > 75) return '#FF6B35';
    return color;
  };

  const displayColor = getStatusColor();

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] text-industrial-muted uppercase tracking-wider">
          {label}
        </span>
        <span className="font-mono text-sm" style={{ color: displayColor }}>
          {Math.round(value)}
          <span className="text-industrial-muted text-[10px]"> / {max}{unit && ` ${unit}`}</span>
        </span>
      </div>
      <div className="h-3 bg-industrial-bg rounded-full overflow-hidden border border-industrial-border">
        <div
          className="h-full rounded-full transition-all duration-300 relative"
          style={{
            width: `${percentage}%`,
            backgroundColor: displayColor,
            boxShadow: percentage > 75 ? `0 0 10px ${displayColor}` : 'none',
          }}
        />
        {showPeak && peakValue !== undefined && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/50"
            style={{ left: `${peakPercentage}%` }}
          />
        )}
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  status: 'active' | 'warning' | 'error' | 'idle';
  label: string;
  value?: string | number;
  unit?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  value,
  unit,
}) => {
  const statusConfig = {
    active: { color: '#00D26A', class: 'status-active' },
    warning: { color: '#FF6B35', class: 'status-warning' },
    error: { color: '#FF3B30', class: 'status-error' },
    idle: { color: '#8A9CB3', class: 'status-idle' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-industrial-bg border border-industrial-border">
      <div className={cn('status-indicator', config.class)} />
      <div className="flex-1">
        <p className="text-[10px] text-industrial-muted uppercase tracking-wider">
          {label}
        </p>
        {value !== undefined && (
          <p className="font-mono text-sm" style={{ color: config.color }}>
            {value}
            {unit && <span className="text-industrial-muted text-[10px] ml-1">{unit}</span>}
          </p>
        )}
      </div>
    </div>
  );
};

interface DigitalDisplayProps {
  value: string | number;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DigitalDisplay: React.FC<DigitalDisplayProps> = ({
  value,
  label,
  color = '#00F0FF',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-industrial-bg border border-industrial-border">
      <span className="text-[10px] text-industrial-muted uppercase tracking-wider mb-1">
        {label}
      </span>
      <span
        className={cn('font-display font-bold glow-text', sizeClasses[size])}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
};
