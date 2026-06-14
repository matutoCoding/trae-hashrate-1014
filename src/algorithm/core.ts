import { TimedAction, NozzleGroup, PhysicalConfig, SafetyWarning, FlowStatus, PumpConfig, AudioAnalysisResult, WaterEffect } from '../types';

const GRAVITY = 9.8;

export const calculateWaterRiseTime = (height: number): number => {
  if (height <= 0) return 0;
  return Math.sqrt((2 * height) / GRAVITY) * 1000;
};

export const calculateDelayCompensation = (
  action: TimedAction,
  nozzleGroup: NozzleGroup,
  physicalConfig: PhysicalConfig,
  effectHeight: number = 10
): number => {
  const valveDelay = nozzleGroup.responseTime || physicalConfig.valveResponseTime;
  const waterRiseTime = calculateWaterRiseTime(effectHeight);
  return valveDelay + waterRiseTime;
};

export const applyDelayCompensation = (
  actions: TimedAction[],
  nozzleGroups: NozzleGroup[],
  physicalConfig: PhysicalConfig
): TimedAction[] => {
  return actions.map(action => {
    const group = nozzleGroups.find(g => g.id === action.nozzleGroupId);
    if (!group) return action;

    const height = (action.parameters.height || 50) / 100 * 20;
    const compensation = calculateDelayCompensation(action, group, physicalConfig, height);

    return {
      ...action,
      delayCompensation: compensation,
      startTime: Math.max(0, action.startTime - compensation),
    };
  });
};

export const calculateInstantaneousFlow = (
  actions: TimedAction[],
  nozzleGroups: NozzleGroup[],
  time: number
): number => {
  let totalFlow = 0;

  actions.forEach(action => {
    const group = nozzleGroups.find(g => g.id === action.nozzleGroupId);
    if (!group) return;

    const compensatedStartTime = action.startTime;
    const compensatedEndTime = action.startTime + action.duration;

    if (time >= compensatedStartTime && time <= compensatedEndTime) {
      const progress = (time - compensatedStartTime) / action.duration;
      const intensity = action.intensity;
      const heightParam = action.parameters.height || 50;
      const flowFactor = (heightParam / 100) * intensity;

      let dynamicFactor = 1;
      if (progress < 0.2) {
        dynamicFactor = progress / 0.2;
      } else if (progress > 0.8) {
        dynamicFactor = (1 - progress) / 0.2;
      }

      totalFlow += group.maxFlowRate * flowFactor * dynamicFactor;
    }
  });

  return totalFlow;
};

export const checkFlowCapacity = (
  actions: TimedAction[],
  nozzleGroups: NozzleGroup[],
  pumpConfig: PumpConfig,
  timeStep: number = 100
): FlowStatus[] => {
  if (actions.length === 0) return [];

  const maxTime = Math.max(...actions.map(a => a.startTime + a.duration));
  const effectiveMax = pumpConfig.maxCapacity * pumpConfig.safetyMargin;
  const statuses: FlowStatus[] = [];

  for (let t = 0; t <= maxTime; t += timeStep) {
    const totalFlow = calculateInstantaneousFlow(actions, nozzleGroups, t);
    const activeGroups = actions.filter(a => {
      const compStart = a.startTime;
      const compEnd = a.startTime + a.duration;
      return t >= compStart && t <= compEnd;
    }).length;

    statuses.push({
      time: t,
      totalFlow,
      maxCapacity: pumpConfig.maxCapacity,
      percentage: (totalFlow / effectiveMax) * 100,
      overflow: totalFlow > effectiveMax,
      activeGroups,
    });
  }

  return statuses;
};

export const generateFlowWarnings = (flowStatuses: FlowStatus[]): SafetyWarning[] => {
  const warnings: SafetyWarning[] = [];
  const overflowPeriods: { start: number; end: number; maxFlow: number }[] = [];

  let currentPeriod: { start: number; end: number; maxFlow: number } | null = null;

  flowStatuses.forEach(status => {
    if (status.overflow) {
      if (!currentPeriod) {
        currentPeriod = { start: status.time, end: status.time, maxFlow: status.totalFlow };
      } else {
        currentPeriod.end = status.time;
        currentPeriod.maxFlow = Math.max(currentPeriod.maxFlow, status.totalFlow);
      }
    } else if (currentPeriod) {
      overflowPeriods.push(currentPeriod);
      currentPeriod = null;
    }
  });

  if (currentPeriod) {
    overflowPeriods.push(currentPeriod);
  }

  overflowPeriods.forEach((period, index) => {
    const severity = period.maxFlow > flowStatuses[0].maxCapacity * 1.1 ? 'critical' : 'warning';
    const exceeded = Math.round(period.maxFlow - flowStatuses[0].maxCapacity);

    warnings.push({
      id: `flow-warning-${index}`,
      type: 'flow',
      severity,
      time: period.start,
      message: `流量超限 ${exceeded} L/min，持续 ${Math.round(period.end - period.start)}ms`,
      affectedGroups: [],
      suggestion: '建议错开阀门开启时间或降低喷射强度',
    });
  });

  return warnings;
};

export const checkWaterHammer = (
  actions: TimedAction[],
  thresholdCount: number = 5,
  timeWindow: number = 100,
  maxFlowChange: number = 500
): SafetyWarning[] => {
  const warnings: SafetyWarning[] = [];
  const sortedByStart = [...actions].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sortedByStart.length; i++) {
    const windowStart = sortedByStart[i].startTime;
    const windowEnd = windowStart + timeWindow;
    const windowActions = sortedByStart.filter(a => a.startTime >= windowStart && a.startTime <= windowEnd);

    if (windowActions.length >= thresholdCount) {
      const totalFlowChange = windowActions.reduce((sum, a) => {
        const group = windowActions.find(x => x.nozzleGroupId === a.nozzleGroupId);
        return sum + (group ? group.intensity * 100 : 0);
      }, 0);

      const severity = windowActions.length >= thresholdCount * 1.5 || totalFlowChange > maxFlowChange ? 'critical' : 'warning';

      warnings.push({
        id: `waterhammer-${i}`,
        type: 'waterhammer',
        severity,
        time: windowStart,
        message: `${windowActions.length} 组阀门在 ${timeWindow}ms 内同时开启，存在水锤冲击风险`,
        affectedGroups: windowActions.map(a => a.nozzleGroupId),
        suggestion: `建议将阀门开启时间错开至少 ${Math.ceil(timeWindow / thresholdCount)}ms`,
      });

      i += windowActions.length - 1;
    }
  }

  return warnings;
};

export const calculatePressureChange = (
  flowChange: number,
  pipeDiameter: number,
  pipeLength: number = 50
): number => {
  const pipeArea = Math.PI * Math.pow(pipeDiameter / 2, 2);
  const velocityChange = (flowChange / 60000) / pipeArea;
  const waveSpeed = 1000;
  const density = 1000;

  return density * waveSpeed * velocityChange / 1000000;
};

export const autoMatchEffects = (
  analysis: AudioAnalysisResult,
  effects: WaterEffect[],
  nozzleGroups: NozzleGroup[]
): TimedAction[] => {
  const actions: TimedAction[] = [];
  let actionId = 0;

  const beatInterval = 60000 / analysis.bpm;

  analysis.sections.forEach(section => {
    const sectionDuration = section.endTime - section.startTime;
    const intensity = section.intensity;

    let beatCount = 0;
    analysis.beatTimes.forEach(beatTime => {
      if (beatTime >= section.startTime && beatTime <= section.endTime) {
        beatCount++;

        const groupIndex = beatCount % nozzleGroups.length;
        const group = nozzleGroups[groupIndex];

        let effectId: string;
        let duration: number;

        if (section.type === 'chorus') {
          effectId = beatCount % 4 === 0 ? 'burst-simultaneous' : 'wave-horizontal';
          duration = beatInterval * 2;
        } else if (section.type === 'verse') {
          effectId = beatCount % 2 === 0 ? 'column-pulse' : 'run-chase';
          duration = beatInterval;
        } else if (section.type === 'intro' || section.type === 'outro') {
          effectId = 'column-pulse';
          duration = beatInterval * 3;
        } else {
          effectId = 'wave-horizontal';
          duration = beatInterval * 1.5;
        }

        const effect = effects.find(e => e.id === effectId) || effects[0];
        const actionIntensity = 0.4 + intensity * 0.6 * (beatCount % 2 === 0 ? 1 : 0.7);

        const baseParams: Record<string, any> = {};
        effect.parameters.forEach(p => {
          baseParams[p.name] = p.defaultValue;
        });

        if (section.type === 'chorus') {
          baseParams.height = Math.min(100, 70 + intensity * 30);
        }

        actions.push({
          id: `auto-action-${actionId++}`,
          nozzleGroupId: group.id,
          effectId,
          startTime: beatTime,
          duration,
          intensity: actionIntensity,
          delayCompensation: 0,
          parameters: baseParams,
          sectionId: section.id,
        });
      }
    });
  });

  analysis.downbeatTimes.forEach(downbeat => {
    const section = analysis.sections.find(s => downbeat >= s.startTime && downbeat <= s.endTime);
    if (section && section.type === 'chorus') {
      actions.push({
        id: `auto-action-${actionId++}`,
        nozzleGroupId: nozzleGroups[0].id,
        effectId: 'burst-simultaneous',
        startTime: downbeat,
        duration: beatInterval * 3,
        intensity: 1.0,
        delayCompensation: 0,
        parameters: { height: 100, riseTime: 400, fallTime: 600 },
        sectionId: section.id,
      });
    }
  });

  return actions;
};

export const offsetForRunningEffect = (
  actions: TimedAction[],
  nozzleGroupIds: string[],
  offsetPerGroup: number = 50
): TimedAction[] => {
  return actions.map(action => {
    const groupIndex = nozzleGroupIds.indexOf(action.nozzleGroupId);
    if (groupIndex === -1) return action;

    return {
      ...action,
      startTime: action.startTime + groupIndex * offsetPerGroup,
    };
  });
};

export const mergeActions = (actions1: TimedAction[], actions2: TimedAction[]): TimedAction[] => {
  const merged = [...actions1];

  actions2.forEach(action2 => {
    const existingIndex = merged.findIndex(
      a => a.nozzleGroupId === action2.nozzleGroupId &&
        Math.abs(a.startTime - action2.startTime) < 50
    );

    if (existingIndex === -1) {
      merged.push(action2);
    } else {
      const existing = merged[existingIndex];
      if (action2.duration > existing.duration) {
        merged[existingIndex] = {
          ...existing,
          duration: Math.max(existing.duration, action2.duration),
          intensity: Math.max(existing.intensity, action2.intensity),
        };
      }
    }
  });

  return merged.sort((a, b) => a.startTime - b.startTime);
};

export const splitActionsBySection = (
  actions: TimedAction[],
  sections: { id: string; startTime: number; endTime: number }[]
): Record<string, TimedAction[]> => {
  const result: Record<string, TimedAction[]> = {};

  sections.forEach(section => {
    result[section.id] = actions.filter(
      a => a.startTime >= section.startTime && a.startTime <= section.endTime
    );
  });

  return result;
};

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [minutes, secondsMs] = parts;
    const [seconds, ms] = secondsMs.split('.');
    return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(ms) * 10;
  }
  return 0;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};
