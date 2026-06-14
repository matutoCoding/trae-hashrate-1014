import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Settings,
  Gauge,
  Zap,
  Droplets,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';
import { PlaybackControls } from '@/components/common/PlaybackControls';
import { Gauge as GaugeComponent, BarGauge, DigitalDisplay } from '@/components/Dashboard/Gauges';
import { useAppStore } from '@/store/useAppStore';
import { calculateWaterRiseTime } from '@/algorithm/core';
import { SafetyWarning, FlowStatus } from '@/types';
import { formatTime, cn } from '@/utils/helpers';

export const CalibrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedWarning, setExpandedWarning] = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const currentScript = useAppStore((state) => state.currentScript);
  const analysisResult = useAppStore((state) => state.analysisResult);
  const nozzleGroups = useAppStore((state) => state.nozzleGroups);
  const warnings = useAppStore((state) => state.warnings);
  const flowStatuses = useAppStore((state) => state.flowStatuses);
  const pumpConfig = useAppStore((state) => state.pumpConfig);
  const physicalConfig = useAppStore((state) => state.physicalConfig);
  const playback = useAppStore((state) => state.playback);
  const isCalibrated = useAppStore((state) => state.isCalibrated);

  const setPlayback = useAppStore((state) => state.setPlayback);
  const updatePlaybackTime = useAppStore((state) => state.updatePlaybackTime);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const calibrateTiming = useAppStore((state) => state.calibrateTiming);
  const validateSafety = useAppStore((state) => state.validateSafety);
  const setPumpConfig = useAppStore((state) => state.setPumpConfig);
  const setPhysicalConfig = useAppStore((state) => state.setPhysicalConfig);
  const resolveWarning = useAppStore((state) => state.resolveWarning);
  const updateAction = useAppStore((state) => state.updateAction);

  const unresolvedWarnings = warnings.filter((w) => !w.resolved);
  const criticalWarnings = unresolvedWarnings.filter((w) => w.severity === 'critical');
  const flowWarnings = unresolvedWarnings.filter((w) => w.type === 'flow');
  const waterHammerWarnings = unresolvedWarnings.filter((w) => w.type === 'waterhammer');

  const maxFlow = useMemo(() => {
    if (flowStatuses.length === 0) return 0;
    return Math.max(...flowStatuses.map((f) => f.totalFlow));
  }, [flowStatuses]);

  const avgFlow = useMemo(() => {
    if (flowStatuses.length === 0) return 0;
    return flowStatuses.reduce((sum, f) => sum + f.totalFlow, 0) / flowStatuses.length;
  }, [flowStatuses]);

  const peakFlowTime = useMemo(() => {
    if (flowStatuses.length === 0) return 0;
    const maxStatus = flowStatuses.reduce((max, f) => (f.totalFlow > max.totalFlow ? f : max), flowStatuses[0]);
    return maxStatus.time;
  }, [flowStatuses]);

  const handleCalibrate = () => {
    calibrateTiming();
  };

  const handleApplySuggestion = (warning: SafetyWarning) => {
    if (warning.type === 'waterhammer' && warning.affectedGroups.length > 1) {
      warning.affectedGroups.forEach((groupId, index) => {
        const action = currentScript?.actions.find(
          (a) => a.nozzleGroupId === groupId && Math.abs(a.startTime - warning.time) < 200
        );
        if (action) {
          updateAction(action.id, { startTime: action.startTime + index * 50 });
        }
      });
      validateSafety();
    }
    resolveWarning(warning.id);
  };

  const handleJumpToWarning = (warning: SafetyWarning) => {
    updatePlaybackTime(Math.max(0, warning.time - 1000));
  };

  if (!currentScript || !analysisResult) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 text-industrial-muted mx-auto mb-4" />
          <p className="text-industrial-text font-mono">请先创建编排脚本</p>
          <button
            onClick={() => navigate('/choreography')}
            className="industrial-button-primary mt-4"
          >
            前往水形编排
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-industrial-border bg-industrial-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <h2 className="font-display text-lg text-industrial-text">时序校准</h2>
            </div>
            <div className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono',
              isCalibrated
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-warning/10 text-warning border border-warning/30'
            )}>
              {isCalibrated ? (
                <><CheckCircle className="w-3 h-3" /> 已校准</>
              ) : (
                <><AlertTriangle className="w-3 h-3" /> 待校准</>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCalibrate}
              className="industrial-button-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              执行延迟补偿
            </button>
            <button
              onClick={validateSafety}
              className="industrial-button flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              重新校验
            </button>
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={cn(
                'industrial-button flex items-center gap-2',
                showConfigPanel && 'border-accent text-accent'
              )}
            >
              <Settings className="w-4 h-4" />
              参数配置
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r border-industrial-border bg-industrial-panel flex flex-col">
          <div className="p-4 border-b border-industrial-border">
            <h3 className="industrial-label mb-4">系统参数</h3>
            <div className="grid grid-cols-2 gap-4">
              <GaugeComponent
                data={{
                  value: maxFlow,
                  max: pumpConfig.maxCapacity,
                  min: 0,
                  label: '峰值流量',
                  unit: 'L/min',
                  color: '#00F0FF',
                }}
                size={100}
              />
              <GaugeComponent
                data={{
                  value: (maxFlow / pumpConfig.maxCapacity) * 100,
                  max: 100,
                  min: 0,
                  label: '负载率',
                  unit: '%',
                  color: maxFlow > pumpConfig.maxCapacity * 0.9 ? '#FF3B30' : '#00D26A',
                }}
                size={100}
              />
            </div>
          </div>

          {showConfigPanel && (
            <div className="p-4 border-b border-industrial-border bg-industrial-bg/50">
              <h4 className="industrial-label mb-3 flex items-center gap-2">
                <Wrench className="w-3 h-3" />
                物理参数配置
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-industrial-muted">重力加速度 (m/s²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={physicalConfig.gravity}
                    onChange={(e) => setPhysicalConfig({ gravity: parseFloat(e.target.value) })}
                    className="industrial-input text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-industrial-muted">阀门响应时间 (ms)</label>
                  <input
                    type="number"
                    value={physicalConfig.valveResponseTime}
                    onChange={(e) => setPhysicalConfig({ valveResponseTime: parseInt(e.target.value) })}
                    className="industrial-input text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-industrial-muted">管道直径 (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={physicalConfig.pipeDiameter}
                    onChange={(e) => setPhysicalConfig({ pipeDiameter: parseFloat(e.target.value) })}
                    className="industrial-input text-xs h-8"
                  />
                </div>
              </div>

              <h4 className="industrial-label mb-3 mt-4 flex items-center gap-2">
                <Gauge className="w-3 h-3" />
                泵组配置
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-industrial-muted">最大供水能力 (L/min)</label>
                  <input
                    type="number"
                    value={pumpConfig.maxCapacity}
                    onChange={(e) => setPumpConfig({ maxCapacity: parseInt(e.target.value) })}
                    className="industrial-input text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-industrial-muted">安全系数 ({pumpConfig.safetyMargin * 100}%)</label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={pumpConfig.safetyMargin}
                    onChange={(e) => setPumpConfig({ safetyMargin: parseFloat(e.target.value) })}
                    className="w-full accent-accent"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-[10px] text-industrial-muted">
                  水柱上升时间 (10m): {calculateWaterRiseTime(10).toFixed(0)}ms
                </p>
                <p className="text-[10px] text-industrial-muted mt-1">
                  水柱上升时间 (20m): {calculateWaterRiseTime(20).toFixed(0)}ms
                </p>
                <p className="text-[10px] text-industrial-muted mt-1">
                  水柱上升时间 (30m): {calculateWaterRiseTime(30).toFixed(0)}ms
                </p>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-industrial-border">
            <h4 className="industrial-label mb-3">流量监控</h4>
            <div className="space-y-3">
              <BarGauge
                value={maxFlow}
                max={pumpConfig.maxCapacity}
                label="峰值流量"
                unit="L/min"
                color="#00F0FF"
              />
              <BarGauge
                value={avgFlow}
                max={pumpConfig.maxCapacity}
                label="平均流量"
                unit="L/min"
                color="#00D26A"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <DigitalDisplay
                value={flowWarnings.length}
                label="流量警告"
                color={flowWarnings.length > 0 ? '#FF6B35' : '#00D26A'}
                size="sm"
              />
              <DigitalDisplay
                value={waterHammerWarnings.length}
                label="水锤警告"
                color={waterHammerWarnings.length > 0 ? '#FF6B35' : '#00D26A'}
                size="sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <h4 className="industrial-label mb-3 flex items-center gap-2">
              <Droplets className="w-3 h-3" />
              延迟补偿详情
            </h4>
            <div className="space-y-2">
              {nozzleGroups.slice(0, 5).map((group) => {
                const groupActions = currentScript.actions.filter(
                  (a) => a.nozzleGroupId === group.id && a.delayCompensation > 0
                );
                const avgDelay = groupActions.length > 0
                  ? groupActions.reduce((sum, a) => sum + a.delayCompensation, 0) / groupActions.length
                  : 0;

                return (
                  <div
                    key={group.id}
                    className="p-2 rounded-md bg-industrial-bg border border-industrial-border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-xs text-industrial-text font-mono truncate flex-1">
                        {group.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-industrial-muted">响应: {group.responseTime}ms</span>
                      <span className="text-accent">补偿: {avgDelay.toFixed(0)}ms</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="industrial-panel p-4">
              <h3 className="industrial-label mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                流量曲线
              </h3>
              <div className="h-48 bg-industrial-bg rounded-md border border-industrial-border overflow-hidden relative">
                {flowStatuses.length > 0 ? (
                  <svg width="100%" height="100%" viewBox={`0 0 ${flowStatuses.length * 4} 180`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0 180 ${flowStatuses.map((f, i) => {
                        const x = i * 4;
                        const y = 180 - (f.totalFlow / pumpConfig.maxCapacity) * 160;
                        return `L ${x} ${y}`;
                      }).join(' ')} L ${flowStatuses.length * 4} 180 Z`}
                      fill="url(#flowGradient)"
                    />
                    <path
                      d={`M 0 ${180 - (flowStatuses[0]?.totalFlow / pumpConfig.maxCapacity) * 160 || 0} ${flowStatuses.map((f, i) => {
                        const x = i * 4;
                        const y = 180 - (f.totalFlow / pumpConfig.maxCapacity) * 160;
                        return `L ${x} ${y}`;
                      }).join(' ')}`}
                      fill="none"
                      stroke="#00F0FF"
                      strokeWidth="2"
                    />
                    <line
                      x1="0"
                      y1={180 - pumpConfig.safetyMargin * 160}
                      x2={flowStatuses.length * 4}
                      y2={180 - pumpConfig.safetyMargin * 160}
                      stroke="#FF6B35"
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                    <text
                      x="10"
                      y={180 - pumpConfig.safetyMargin * 160 - 5}
                      fill="#FF6B35"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                    >
                      安全阈值 {Math.round(pumpConfig.maxCapacity * pumpConfig.safetyMargin)} L/min
                    </text>
                    <line
                      x1={peakFlowTime / 100 * 4}
                      y1="0"
                      x2={peakFlowTime / 100 * 4}
                      y2="180"
                      stroke="#FF6B35"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  </svg>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs text-industrial-muted">暂无流量数据，请先执行校验</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-industrial-muted">
                <span>0s</span>
                <span>峰值: {formatTime(peakFlowTime)}</span>
                <span>{formatTime(analysisResult.duration)}</span>
              </div>
            </div>

            <div className="industrial-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="industrial-label flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-warning" />
                  安全警告 ({unresolvedWarnings.length})
                </h3>
                {unresolvedWarnings.length > 0 && (
                  <div className="flex items-center gap-2">
                    {criticalWarnings.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-mono">
                        {criticalWarnings.length} 严重
                      </span>
                    )}
                  </div>
                )}
              </div>

              {unresolvedWarnings.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-sm text-success font-mono">所有安全检查通过</p>
                  <p className="text-xs text-industrial-muted mt-1">
                    没有检测到流量超限或水锤冲击风险
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {unresolvedWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className={cn(
                        'rounded-lg border overflow-hidden transition-all',
                        warning.severity === 'critical'
                          ? 'bg-danger/5 border-danger/30'
                          : 'bg-warning/5 border-warning/30'
                      )}
                    >
                      <div
                        className="p-3 cursor-pointer flex items-start gap-3"
                        onClick={() => setExpandedWarning(expandedWarning === warning.id ? null : warning.id)}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          warning.severity === 'critical' ? 'bg-danger/20' : 'bg-warning/20'
                        )}>
                          {warning.type === 'flow' ? (
                            <Droplets className={cn(
                              'w-4 h-4',
                              warning.severity === 'critical' ? 'text-danger' : 'text-warning'
                            )} />
                          ) : (
                            <AlertTriangle className={cn(
                              'w-4 h-4',
                              warning.severity === 'critical' ? 'text-danger' : 'text-warning'
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-mono',
                              warning.severity === 'critical' ? 'text-danger' : 'text-warning'
                            )}>
                              {warning.type === 'flow' ? '流量超限' : '水锤冲击'}
                            </span>
                            <span className="text-[10px] text-industrial-muted">
                              {formatTime(warning.time)}
                            </span>
                            {warning.severity === 'critical' && (
                              <span className="px-1.5 py-0.5 rounded bg-danger/20 text-danger text-[9px] font-mono">
                                严重
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-industrial-text mt-1">{warning.message}</p>
                        </div>
                        {expandedWarning === warning.id ? (
                          <ChevronUp className="w-4 h-4 text-industrial-muted flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-industrial-muted flex-shrink-0" />
                        )}
                      </div>

                      {expandedWarning === warning.id && (
                        <div className="px-3 pb-3 border-t border-industrial-border/50">
                          <div className="pt-3">
                            <p className="text-[10px] text-industrial-muted mb-2">建议措施:</p>
                            <p className="text-xs text-industrial-text mb-3">{warning.suggestion}</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleJumpToWarning(warning)}
                                className="industrial-button text-xs py-1 px-3"
                              >
                                跳转到时间点
                              </button>
                              <button
                                onClick={() => handleApplySuggestion(warning)}
                                className="industrial-button-primary text-xs py-1 px-3"
                              >
                                自动修复
                              </button>
                              <button
                                onClick={() => resolveWarning(warning.id)}
                                className="industrial-button text-xs py-1 px-3 text-success"
                              >
                                标记已解决
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="industrial-panel p-4">
              <h3 className="industrial-label mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                时间对比表 (前10个动作)
              </h3>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-industrial-muted text-[10px] uppercase">
                      <th className="text-left py-2 px-3 bg-industrial-bg sticky top-0">#</th>
                      <th className="text-left py-2 px-3 bg-industrial-bg sticky top-0">喷头组</th>
                      <th className="text-right py-2 px-3 bg-industrial-bg sticky top-0">原始编排时间</th>
                      <th className="text-right py-2 px-3 bg-industrial-bg sticky top-0">延迟补偿量</th>
                      <th className="text-right py-2 px-3 bg-industrial-bg sticky top-0">实际触发时间</th>
                      <th className="text-center py-2 px-3 bg-industrial-bg sticky top-0">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentScript.actions.slice(0, 10).map((action, index) => {
                      const group = nozzleGroups.find((g) => g.id === action.nozzleGroupId);
                      const originalTime = action.originalStartTime ?? action.startTime;
                      const actualTime = action.startTime;
                      const compensation = action.delayCompensation;
                      return (
                        <tr key={action.id} className="border-t border-industrial-border/50 hover:bg-industrial-bg/50">
                          <td className="py-2 px-3 text-industrial-muted">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group?.color }}
                              />
                              <span className="text-industrial-text">{group?.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-industrial-muted">
                            {formatTime(originalTime)}
                          </td>
                          <td className="py-2 px-3 text-right text-warning">
                            -{Math.round(compensation)}ms
                          </td>
                          <td className="py-2 px-3 text-right text-accent font-bold">
                            {formatTime(actualTime)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {action.delayCompensation > 0 ? (
                              <span className="inline-flex items-center gap-1 text-success">
                                <CheckCircle className="w-3 h-3" />
                                已补偿
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-industrial-muted">
                                <AlertCircle className="w-3 h-3" />
                                待校准
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {currentScript.actions.length > 10 && (
                <p className="text-[10px] text-industrial-muted mt-2 text-center">
                  共 {currentScript.actions.length} 个动作，仅显示前 10 个
                </p>
              )}
            </div>
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
      </div>

      <div className="h-10 border-t border-industrial-border bg-industrial-panel px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-industrial-muted">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-success" />
            已校准动作: {currentScript.actions.filter((a) => a.delayCompensation > 0).length} / {currentScript.actions.length}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            未解决警告: {unresolvedWarnings.length}
          </span>
        </div>
        <button
          onClick={() => navigate('/playback')}
          className={cn(
            'industrial-button-primary flex items-center gap-2',
            unresolvedWarnings.length > 0 && 'opacity-50'
          )}
          disabled={unresolvedWarnings.length > 0}
        >
          前往效果回放
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
