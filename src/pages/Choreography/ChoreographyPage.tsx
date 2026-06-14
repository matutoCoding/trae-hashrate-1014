import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Wand2,
  ArrowRight,
  Settings,
  Zap,
  Palette,
  Clock,
  Gauge,
} from 'lucide-react';
import { Timeline } from '@/components/Timeline/Timeline';
import { PlaybackControls } from '@/components/common/PlaybackControls';
import { BarGauge, StatusIndicator } from '@/components/Dashboard/Gauges';
import { useAppStore } from '@/store/useAppStore';
import { WaterEffect, NozzleGroup, TimedAction } from '@/types';
import { cn, formatTime } from '@/utils/helpers';
import { getSectionTypeName, getSectionTypeColor } from '@/algorithm/audioAnalysis';

export const ChoreographyPage: React.FC = () => {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [draggedEffect, setDraggedEffect] = useState<WaterEffect | null>(null);
  const [showEffectPreview, setShowEffectPreview] = useState<string | null>(null);

  const currentScript = useAppStore((state) => state.currentScript);
  const analysisResult = useAppStore((state) => state.analysisResult);
  const nozzleGroups = useAppStore((state) => state.nozzleGroups);
  const waterEffects = useAppStore((state) => state.waterEffects);
  const playback = useAppStore((state) => state.playback);
  const selectedActionId = useAppStore((state) => state.selectedActionId);
  const selectedGroupId = useAppStore((state) => state.selectedGroupId);
  const warnings = useAppStore((state) => state.warnings);
  const isCalibrated = useAppStore((state) => state.isCalibrated);

  const setPlayback = useAppStore((state) => state.setPlayback);
  const updatePlaybackTime = useAppStore((state) => state.updatePlaybackTime);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const setSelectedAction = useAppStore((state) => state.setSelectedAction);
  const setSelectedGroup = useAppStore((state) => state.setSelectedGroup);
  const addAction = useAppStore((state) => state.addAction);
  const updateAction = useAppStore((state) => state.updateAction);
  const deleteAction = useAppStore((state) => state.deleteAction);
  const duplicateAction = useAppStore((state) => state.duplicateAction);
  const updateNozzleGroup = useAppStore((state) => state.updateNozzleGroup);
  const autoMatchEffects = useAppStore((state) => state.autoMatchEffects);
  const validateSafety = useAppStore((state) => state.validateSafety);

  const selectedAction = currentScript?.actions.find((a) => a.id === selectedActionId);
  const selectedGroup = nozzleGroups.find((g) => g.id === selectedGroupId);

  const effectsByCategory = useMemo(() => {
    const categories: Record<string, WaterEffect[]> = {
      burst: [],
      wave: [],
      run: [],
      fan: [],
      column: [],
      custom: [],
    };
    waterEffects.forEach((e) => categories[e.category].push(e));
    return categories;
  }, [waterEffects]);

  const categoryNames: Record<string, string> = {
    burst: '齐射类',
    wave: '波浪类',
    run: '跑动类',
    fan: '扇形类',
    column: '水柱类',
    custom: '自定义',
  };

  const categoryIcons: Record<string, string> = {
    burst: '⚡',
    wave: '🌊',
    run: '🏃',
    fan: '扇子',
    column: '💧',
    custom: '✨',
  };

  const handleDragStart = (effect: WaterEffect) => {
    setDraggedEffect(effect);
  };

  const handleDrop = (group: NozzleGroup, time: number) => {
    if (!draggedEffect) return;

    const params: Record<string, any> = {};
    draggedEffect.parameters.forEach((p) => {
      params[p.name] = p.defaultValue;
    });

    addAction({
      nozzleGroupId: group.id,
      effectId: draggedEffect.id,
      startTime: Math.round(time / 50) * 50,
      duration: 2000,
      intensity: 0.8,
      parameters: params,
    });

    setDraggedEffect(null);
    validateSafety();
  };

  const handleAutoMatch = () => {
    autoMatchEffects();
  };

  if (!currentScript || !analysisResult) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-16 h-16 text-industrial-muted mx-auto mb-4" />
          <p className="text-industrial-text font-mono">请先导入音乐并创建编排脚本</p>
          <button
            onClick={() => navigate('/')}
            className="industrial-button-primary mt-4"
          >
            前往音轨解析
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 flex-shrink-0 border-r border-industrial-border flex flex-col bg-industrial-panel">
          <div className="p-3 border-b border-industrial-border">
            <h3 className="font-display text-sm text-industrial-text flex items-center gap-2">
              <Palette className="w-4 h-4 text-accent" />
              喷头组
            </h3>
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-2">
            {nozzleGroups.map((group) => (
              <div
                key={group.id}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-all border',
                  selectedGroupId === group.id
                    ? 'bg-accent/10 border-accent/50'
                    : 'bg-industrial-bg border-industrial-border hover:border-accent/30'
                )}
                onClick={() => setSelectedGroup(group.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const time = (y / rect.height) * analysisResult.duration;
                  handleDrop(group, playback.currentTime);
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-mono text-sm text-industrial-text flex-1 truncate">
                    {group.name}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-industrial-muted">
                  <span>{group.nozzles.length} 喷头</span>
                  <span>{group.valveType === 'variable' ? '变频' : '开关'}</span>
                  <span>{group.maxFlowRate} L/min</span>
                  <span>{group.responseTime}ms</span>
                </div>

                {draggedEffect && (
                  <div className="mt-2 p-2 rounded bg-accent/10 border border-accent/30 border-dashed text-center">
                    <span className="text-[10px] text-accent">拖放到此添加</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedGroup && (
            <div className="p-3 border-t border-industrial-border bg-industrial-bg">
              <p className="industrial-label mb-2">组参数</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-industrial-muted">响应时间</label>
                  <input
                    type="number"
                    value={selectedGroup.responseTime}
                    onChange={(e) =>
                      updateNozzleGroup(selectedGroup.id, { responseTime: parseInt(e.target.value) })
                    }
                    className="industrial-input text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-industrial-muted">最大流量</label>
                  <input
                    type="number"
                    value={selectedGroup.maxFlowRate}
                    className="industrial-input text-xs h-8"
                    disabled
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-industrial-border flex items-center justify-between bg-industrial-panel">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="industrial-button p-1.5"
                >
                  <span className="text-lg">−</span>
                </button>
                <span className="font-mono text-xs text-industrial-muted w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(5, zoom + 0.25))}
                  className="industrial-button p-1.5"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>

              <div className="h-6 w-px bg-industrial-border" />

              <button
                onClick={handleAutoMatch}
                className="industrial-button-success flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                <span className="text-xs">智能匹配水形</span>
              </button>

              <button
                onClick={() => navigate('/calibration')}
                className={cn(
                  'industrial-button flex items-center gap-2',
                  isCalibrated
                    ? 'border-success/50 text-success'
                    : 'border-warning/50 text-warning'
                )}
              >
                <Clock className="w-4 h-4" />
                <span className="text-xs">时序校准</span>
                {!isCalibrated && (
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <StatusIndicator
                status={currentScript.actions.length > 0 ? 'active' : 'idle'}
                label="动作数"
                value={currentScript.actions.length}
              />
              {warnings.filter((w) => !w.resolved).length > 0 && (
                <StatusIndicator
                  status="warning"
                  label="安全警告"
                  value={warnings.filter((w) => !w.resolved).length}
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <Timeline
              actions={currentScript.actions}
              nozzleGroups={nozzleGroups}
              effects={waterEffects}
              duration={analysisResult.duration}
              currentTime={playback.currentTime}
              selectedActionId={selectedActionId}
              onSelectAction={setSelectedAction}
              onUpdateAction={(id, updates) => {
                updateAction(id, updates);
                validateSafety();
              }}
              onSeek={updatePlaybackTime}
              zoom={zoom}
            />

            {analysisResult.sections.length > 0 && (
              <div className="mt-4 industrial-panel p-4">
                <h4 className="industrial-label mb-3">段落编排</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {analysisResult.sections.map((section) => {
                    const sectionActions = currentScript.actions.filter(
                      (a) => a.sectionId === section.id
                    );
                    return (
                      <div
                        key={section.id}
                        className="flex-shrink-0 p-3 rounded-lg border cursor-pointer hover:border-accent/50 transition-colors min-w-[140px]"
                        style={{
                          backgroundColor: `${getSectionTypeColor(section.type)}10`,
                          borderColor: `${getSectionTypeColor(section.type)}40`,
                        }}
                        onClick={() => updatePlaybackTime(section.startTime)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-sm"
                            style={{ color: getSectionTypeColor(section.type) }}
                          >
                            {getSectionTypeName(section.type)}
                          </span>
                          <span className="text-[10px] text-industrial-muted flex-1 text-right">
                            {sectionActions.length} 动作
                          </span>
                        </div>
                        <p className="text-[10px] text-industrial-muted">
                          {formatTime(section.startTime)} - {formatTime(section.endTime)}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  i < Math.round(section.intensity * 5)
                                    ? getSectionTypeColor(section.type)
                                    : '#2A3F5F',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <PlaybackControls
            playback={playback}
            onPlayPause={togglePlay}
            onSeek={updatePlaybackTime}
            onReset={resetPlayback}
            onSpeedChange={(speed) => setPlayback({ speed })}
            onVolumeChange={(volume) => setPlayback({ volume })}
            onToggleLoop={() => setPlayback({ loop: !playback.loop })}
            disabled={!currentScript}
          />
        </div>

        <div className="w-72 flex-shrink-0 border-l border-industrial-border flex flex-col bg-industrial-panel">
          <div className="p-3 border-b border-industrial-border">
            <h3 className="font-display text-sm text-industrial-text flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              水形效果库
            </h3>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {Object.entries(effectsByCategory).map(([category, effects]) => (
              <div key={category} className="mb-4">
                <h4 className="industrial-label px-2 mb-2 flex items-center gap-2">
                  <span>{categoryIcons[category]}</span>
                  {categoryNames[category]}
                </h4>
                <div className="space-y-2">
                  {effects.map((effect) => (
                    <div
                      key={effect.id}
                      draggable
                      onDragStart={() => handleDragStart(effect)}
                      onMouseEnter={() => setShowEffectPreview(effect.id)}
                      onMouseLeave={() => setShowEffectPreview(null)}
                      className={cn(
                        'p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all border',
                        draggedEffect?.id === effect.id
                          ? 'opacity-50'
                          : 'bg-industrial-bg border-industrial-border hover:border-accent/50 hover:bg-industrial-panel'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${effect.color}20` }}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: effect.color }}
                          />
                        </div>
                        <span className="font-mono text-sm text-industrial-text">
                          {effect.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-industrial-muted line-clamp-2 mb-2">
                        {effect.description}
                      </p>

                      {showEffectPreview === effect.id && (
                        <div className="mt-2 p-2 rounded bg-industrial-bg border border-industrial-border">
                          <div className="h-12 flex items-end gap-0.5">
                            {effect.previewFrames[0]?.map((value, i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-t transition-all"
                                style={{
                                  height: `${value * 100}%`,
                                  backgroundColor: effect.color,
                                  opacity: 0.5 + value * 0.5,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedAction && (
            <div className="p-3 border-t border-industrial-border bg-industrial-bg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="industrial-label">动作参数</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateAction(selectedAction.id)}
                    className="p-1.5 rounded hover:bg-industrial-border text-industrial-muted hover:text-accent transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAction(selectedAction.id)}
                    className="p-1.5 rounded hover:bg-danger/10 text-industrial-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-industrial-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    开始时间
                  </label>
                  <input
                    type="number"
                    value={selectedAction.startTime}
                    onChange={(e) =>
                      updateAction(selectedAction.id, { startTime: parseInt(e.target.value) })
                    }
                    className="industrial-input text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-industrial-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    持续时间
                  </label>
                  <input
                    type="number"
                    value={selectedAction.duration}
                    onChange={(e) =>
                      updateAction(selectedAction.id, { duration: parseInt(e.target.value) })
                    }
                    className="industrial-input text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-industrial-muted flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    强度 ({Math.round(selectedAction.intensity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedAction.intensity}
                    onChange={(e) =>
                      updateAction(selectedAction.id, { intensity: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-industrial-bg rounded-full appearance-none cursor-pointer accent-accent"
                  />
                </div>

                {selectedAction.delayCompensation > 0 && (
                  <div className="p-2 rounded bg-warning/10 border border-warning/30">
                    <p className="text-[10px] text-warning">
                      延迟补偿: -{Math.round(selectedAction.delayCompensation)}ms
                    </p>
                  </div>
                )}

                {Object.entries(selectedAction.parameters).map(([key, value]) => {
                  const effect = waterEffects.find((e) => e.id === selectedAction.effectId);
                  const param = effect?.parameters.find((p) => p.name === key);
                  if (!param) return null;

                  return (
                    <div key={key}>
                      <label className="text-[10px] text-industrial-muted">
                        {key} {param.unit && `(${param.unit})`}
                      </label>
                      {param.type === 'number' && (
                        <input
                          type="number"
                          min={param.min}
                          max={param.max}
                          value={value}
                          onChange={(e) =>
                            updateAction(selectedAction.id, {
                              parameters: { ...selectedAction.parameters, [key]: parseFloat(e.target.value) },
                            })
                          }
                          className="industrial-input text-xs h-8"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-10 border-t border-industrial-border bg-industrial-panel px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-industrial-muted">
          <span>喷头组: {nozzleGroups.length}</span>
          <span>动作: {currentScript.actions.length}</span>
          <span>时长: {formatTime(analysisResult.duration)}</span>
        </div>
        <button
          onClick={() => navigate('/calibration')}
          className="industrial-button-primary flex items-center gap-2"
        >
          前往时序校准
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
