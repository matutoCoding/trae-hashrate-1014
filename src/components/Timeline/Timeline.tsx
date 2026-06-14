import React, { useEffect, useRef, useCallback, useState } from 'react';
import { TimedAction, NozzleGroup, WaterEffect } from '@/types';
import { formatTime } from '@/algorithm/core';
import { COLORS, TIMELINE_CONFIG } from '@/utils/constants';
import { cn } from '@/utils/helpers';

interface TimelineProps {
  actions: TimedAction[];
  nozzleGroups: NozzleGroup[];
  effects: WaterEffect[];
  duration: number;
  currentTime: number;
  selectedActionId: string | null;
  onSelectAction: (id: string | null) => void;
  onUpdateAction: (id: string, updates: Partial<TimedAction>) => void;
  onSeek: (time: number) => void;
  zoom?: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  actions,
  nozzleGroups,
  effects,
  duration,
  currentTime,
  selectedActionId,
  onSelectAction,
  onUpdateAction,
  onSeek,
  zoom = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragActionId, setDragActionId] = useState<string | null>(null);

  const pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND * zoom;
  const totalWidth = (duration / 1000) * pixelsPerSecond;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const trackHeight = TIMELINE_CONFIG.TRACK_HEIGHT;
    const headerWidth = 140;
    const contentWidth = width - headerWidth;

    const totalHeight = nozzleGroups.length * trackHeight + 40;

    canvas.width = width * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(0, 0, width, totalHeight);

    const visibleDuration = (contentWidth / pixelsPerSecond) * 1000;
    const timeInterval = visibleDuration > 30000 ? 5000 : visibleDuration > 10000 ? 2000 : 1000;

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;

    for (let t = 0; t <= duration; t += timeInterval) {
      const x = headerWidth + (t / 1000) * pixelsPerSecond;
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(formatTime(t), x, 28);
    }

    nozzleGroups.forEach((group, index) => {
      const y = 40 + index * trackHeight;

      ctx.fillStyle = index % 2 === 0 ? 'rgba(26, 41, 66, 0.5)' : 'transparent';
      ctx.fillRect(headerWidth, y, contentWidth, trackHeight);

      ctx.fillStyle = COLORS.secondary;
      ctx.fillRect(0, y, headerWidth, trackHeight);

      ctx.strokeStyle = COLORS.border;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = group.color || COLORS.accent;
      ctx.beginPath();
      ctx.arc(20, y + trackHeight / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(group.name, 34, y + trackHeight / 2 + 4);

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`${group.nozzles.length}喷头`, headerWidth - 8, y + trackHeight / 2 + 4);
    });

    actions.forEach((action) => {
      const groupIndex = nozzleGroups.findIndex((g) => g.id === action.nozzleGroupId);
      if (groupIndex === -1) return;

      const effect = effects.find((e) => e.id === action.effectId);
      const group = nozzleGroups[groupIndex];
      const y = 40 + groupIndex * trackHeight;
      const x = headerWidth + (action.startTime / 1000) * pixelsPerSecond;
      const actionWidth = Math.max(10, (action.duration / 1000) * pixelsPerSecond);

      const isSelected = action.id === selectedActionId;
      const baseColor = group.color || effect?.color || COLORS.accent;

      ctx.fillStyle = isSelected ? baseColor : `${baseColor}80`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 4, actionWidth - 2, trackHeight - 8, 4);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = COLORS.secondary;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 4, 6, trackHeight - 8, [4, 0, 0, 4]);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + actionWidth - 7, y + 4, 6, trackHeight - 8, [0, 4, 4, 0]);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(effect?.name || action.effectId, x + 8, y + trackHeight / 2 + 4);

      if (action.delayCompensation > 0) {
        const compX = x - (action.delayCompensation / 1000) * pixelsPerSecond;
        ctx.strokeStyle = COLORS.warning;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(compX, y + 4);
        ctx.lineTo(compX, y + trackHeight - 4);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.warning;
        ctx.font = '8px JetBrains Mono';
        ctx.fillText(`-${Math.round(action.delayCompensation)}ms`, compX + 2, y + 14);
      }
    });

    const playheadX = headerWidth + (currentTime / 1000) * pixelsPerSecond;
    ctx.strokeStyle = COLORS.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, totalHeight);
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
  }, [actions, nozzleGroups, effects, duration, currentTime, selectedActionId, pixelsPerSecond]);

  useEffect(() => {
    draw();

    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const getActionAtPosition = (clientX: number, clientY: number): { action: TimedAction; hitArea: 'body' | 'start' | 'end' } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const headerWidth = 140;
    const trackHeight = TIMELINE_CONFIG.TRACK_HEIGHT;

    const contentX = x - headerWidth;
    if (contentX < 0) return null;

    const time = (contentX / pixelsPerSecond) * 1000;
    const groupIndex = Math.floor((y - 40) / trackHeight);

    if (groupIndex < 0 || groupIndex >= nozzleGroups.length) return null;

    const group = nozzleGroups[groupIndex];

    for (const action of actions) {
      if (action.nozzleGroupId !== group.id) continue;

      const actionStart = action.startTime;
      const actionEnd = action.startTime + action.duration;

      if (time >= actionStart - 10 && time <= actionEnd + 10) {
        if (time < actionStart + 50) {
          return { action, hitArea: 'start' };
        } else if (time > actionEnd - 50) {
          return { action, hitArea: 'end' };
        } else {
          return { action, hitArea: 'body' };
        }
      }
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = getActionAtPosition(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const headerWidth = 140;
    const x = e.clientX - rect.left;

    if (hit) {
      setIsDragging(true);
      setDragActionId(hit.action.id);
      setDragOffset(hit.action.startTime - ((x - headerWidth) / pixelsPerSecond) * 1000);

      if (hit.hitArea === 'start' || hit.hitArea === 'end') {
        setDragType(`resize-${hit.hitArea}`);
      } else {
        setDragType('move');
      }

      onSelectAction(hit.action.id);
    } else if (x > headerWidth) {
      const contentX = x - headerWidth;
      const time = (contentX / pixelsPerSecond) * 1000;
      onSeek(Math.max(0, Math.min(time, duration)));
      onSelectAction(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragActionId || !dragType) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const headerWidth = 140;
    const x = e.clientX - rect.left;
    const contentX = x - headerWidth;
    const time = (contentX / pixelsPerSecond) * 1000 + dragOffset;

    const action = actions.find((a) => a.id === dragActionId);
    if (!action) return;

    const snappedTime = Math.round(time / TIMELINE_CONFIG.SNAP_INTERVAL) * TIMELINE_CONFIG.SNAP_INTERVAL;

    if (dragType === 'move') {
      const newStartTime = Math.max(0, Math.min(snappedTime, duration - action.duration));
      onUpdateAction(dragActionId, { startTime: newStartTime });
    } else if (dragType === 'resize-start') {
      const newStartTime = Math.max(0, snappedTime);
      const newDuration = action.duration + (action.startTime - newStartTime);
      if (newDuration >= 100) {
        onUpdateAction(dragActionId, { startTime: newStartTime, duration: newDuration });
      }
    } else if (dragType === 'resize-end') {
      const newDuration = Math.max(100, snappedTime - action.startTime);
      onUpdateAction(dragActionId, { duration: newDuration });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
    setDragActionId(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove as any);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, [isDragging, dragActionId, dragType]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto border border-industrial-border rounded-lg bg-industrial-bg"
    >
      <canvas
        ref={canvasRef}
        className={cn(
          'block',
          isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
};
