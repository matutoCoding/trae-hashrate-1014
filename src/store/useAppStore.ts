import { create } from 'zustand';
import {
  ShowScript,
  TimedAction,
  AudioAnalysisResult,
  NozzleGroup,
  WaterEffect,
  PlaybackState,
  SafetyWarning,
  FlowStatus,
  PumpConfig,
  PhysicalConfig,
  TrackInfo,
  Category,
  ScriptFilter,
} from '../types';
import {
  DEFAULT_WATER_EFFECTS,
  DEFAULT_PUMP_CONFIG,
  DEFAULT_PHYSICAL_CONFIG,
  DEFAULT_CATEGORIES,
  generateDefaultNozzleGroups,
} from '../utils/constants';
import {
  applyDelayCompensation,
  checkFlowCapacity,
  generateFlowWarnings,
  checkWaterHammer,
  autoMatchEffects,
  generateId,
} from '../algorithm/core';
import { generateMockAnalysis } from '../algorithm/audioAnalysis';

interface AppState {
  currentScript: ShowScript | null;
  scripts: ShowScript[];
  tracks: TrackInfo[];
  waterEffects: WaterEffect[];
  categories: Category[];
  nozzleGroups: NozzleGroup[];
  analysisResult: AudioAnalysisResult | null;
  currentTrack: TrackInfo | null;
  playback: PlaybackState;
  pumpConfig: PumpConfig;
  physicalConfig: PhysicalConfig;
  warnings: SafetyWarning[];
  flowStatuses: FlowStatus[];
  scriptFilter: ScriptFilter;
  selectedActionId: string | null;
  selectedGroupId: string | null;
  isAnalyzing: boolean;
  isSaving: boolean;
  isCalibrated: boolean;

  setCurrentScript: (script: ShowScript | null) => void;
  setCurrentTrack: (track: TrackInfo | null) => void;
  setAnalysisResult: (result: AudioAnalysisResult | null) => void;
  setSelectedAction: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;
  setPlayback: (state: Partial<PlaybackState>) => void;
  setPumpConfig: (config: Partial<PumpConfig>) => void;
  setPhysicalConfig: (config: Partial<PhysicalConfig>) => void;
  setScriptFilter: (filter: Partial<ScriptFilter>) => void;

  addAction: (action: Omit<TimedAction, 'id'>) => void;
  updateAction: (id: string, updates: Partial<TimedAction>) => void;
  deleteAction: (id: string) => void;
  duplicateAction: (id: string) => void;

  addNozzleGroup: (group: Omit<NozzleGroup, 'id'>) => void;
  updateNozzleGroup: (id: string, updates: Partial<NozzleGroup>) => void;
  deleteNozzleGroup: (id: string) => void;

  importTrack: (file: File) => Promise<void>;
  analyzeTrack: () => Promise<void>;
  autoMatchEffects: () => void;
  calibrateTiming: () => void;
  validateSafety: () => void;

  createNewScript: (name: string, category: string) => void;
  saveScript: () => Promise<void>;
  loadScript: (id: string) => void;
  deleteScript: (id: string) => void;
  exportScript: (id: string, path: string) => void;

  updatePlaybackTime: (time: number) => void;
  togglePlay: () => void;
  resetPlayback: () => void;

  resolveWarning: (id: string) => void;
  clearWarnings: () => void;
}

const initialPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  loop: false,
  volume: 0.8,
};

const initialFilter: ScriptFilter = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

const createMockScripts = (): ShowScript[] => {
  const mockScripts: ShowScript[] = [];
  const trackNames = [
    { name: 'Victory', artist: 'Two Steps From Hell', category: 'classic', duration: 180000 },
    { name: 'River Flows in You', artist: 'Yiruma', category: 'classic', duration: 210000 },
    { name: 'Thunder', artist: 'Imagine Dragons', category: 'rock', duration: 200000 },
    { name: 'Alone', artist: 'Marshmello', category: 'electronic', duration: 195000 },
    { name: 'Spring Festival Overture', artist: 'Traditional', category: 'festival', duration: 240000 },
  ];

  trackNames.forEach((track, index) => {
    const analysis = generateMockAnalysis(track.duration);
    const groups = generateDefaultNozzleGroups();

    mockScripts.push({
      id: `script-${index}`,
      name: `${track.name} - 水形编排`,
      trackId: `track-${index}`,
      trackName: track.name,
      artist: track.artist,
      category: track.category,
      tags: ['已完成', '演出级'],
      duration: track.duration,
      createdAt: Date.now() - index * 86400000,
      updatedAt: Date.now() - index * 43200000,
      version: `1.${index}.0`,
      actions: autoMatchEffects(analysis, DEFAULT_WATER_EFFECTS, groups),
      nozzleGroups: groups,
      analysisResult: analysis,
      performanceRecords: [
        {
          id: `perf-${index}`,
          timestamp: Date.now() - index * 172800000,
          operator: '张工程师',
          venue: '城市广场音乐喷泉',
          status: 'success',
          notes: '演出效果良好，无异常',
          anomalies: [],
          duration: track.duration,
        },
      ],
      description: `为《${track.name}》精心编排的水形方案`,
    });
  });

  return mockScripts;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentScript: null,
  scripts: createMockScripts(),
  tracks: [],
  waterEffects: DEFAULT_WATER_EFFECTS,
  categories: DEFAULT_CATEGORIES,
  nozzleGroups: generateDefaultNozzleGroups(),
  analysisResult: null,
  currentTrack: null,
  playback: initialPlayback,
  pumpConfig: DEFAULT_PUMP_CONFIG,
  physicalConfig: DEFAULT_PHYSICAL_CONFIG,
  warnings: [],
  flowStatuses: [],
  scriptFilter: initialFilter,
  selectedActionId: null,
  selectedGroupId: null,
  isAnalyzing: false,
  isSaving: false,
  isCalibrated: false,

  setCurrentScript: (script) => set({ currentScript: script }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setSelectedAction: (id) => set({ selectedActionId: id }),
  setSelectedGroup: (id) => set({ selectedGroupId: id }),

  setPlayback: (state) =>
    set((prev) => ({ playback: { ...prev.playback, ...state } })),

  setPumpConfig: (config) =>
    set((prev) => ({ pumpConfig: { ...prev.pumpConfig, ...config } })),

  setPhysicalConfig: (config) =>
    set((prev) => ({ physicalConfig: { ...prev.physicalConfig, ...config } })),

  setScriptFilter: (filter) =>
    set((prev) => ({ scriptFilter: { ...prev.scriptFilter, ...filter } })),

  addAction: (action) => {
    const newAction: TimedAction = {
      ...action,
      id: generateId('action'),
      delayCompensation: 0,
    };

    set((state) => ({
      currentScript: state.currentScript
        ? {
            ...state.currentScript,
            actions: [...state.currentScript.actions, newAction],
            updatedAt: Date.now(),
          }
        : null,
    }));
  },

  updateAction: (id, updates) => {
    set((state) => ({
      currentScript: state.currentScript
        ? {
            ...state.currentScript,
            actions: state.currentScript.actions.map((a) =>
              a.id === id ? { ...a, ...updates } : a
            ),
            updatedAt: Date.now(),
          }
        : null,
    }));
  },

  deleteAction: (id) => {
    set((state) => ({
      currentScript: state.currentScript
        ? {
            ...state.currentScript,
            actions: state.currentScript.actions.filter((a) => a.id !== id),
            updatedAt: Date.now(),
          }
        : null,
      selectedActionId: state.selectedActionId === id ? null : state.selectedActionId,
    }));
  },

  duplicateAction: (id) => {
    const state = get();
    const action = state.currentScript?.actions.find((a) => a.id === id);
    if (!action) return;

    const newAction: TimedAction = {
      ...action,
      id: generateId('action'),
      startTime: action.startTime + 500,
    };

    set((s) => ({
      currentScript: s.currentScript
        ? {
            ...s.currentScript,
            actions: [...s.currentScript.actions, newAction],
            updatedAt: Date.now(),
          }
        : null,
    }));
  },

  addNozzleGroup: (group) => {
    const newGroup: NozzleGroup = {
      ...group,
      id: generateId('group'),
    };

    set((state) => ({
      nozzleGroups: [...state.nozzleGroups, newGroup],
    }));
  },

  updateNozzleGroup: (id, updates) => {
    set((state) => ({
      nozzleGroups: state.nozzleGroups.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  },

  deleteNozzleGroup: (id) => {
    set((state) => ({
      nozzleGroups: state.nozzleGroups.filter((g) => g.id !== id),
      selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
    }));
  },

  importTrack: async (file) => {
    const track: TrackInfo = {
      id: generateId('track'),
      name: file.name.replace(/\.[^/.]+$/, ''),
      artist: '未知艺术家',
      duration: 180000,
      filePath: file.name,
      fileHash: generateId('hash'),
      fileSize: file.size,
      format: file.name.split('.').pop()?.toUpperCase() || 'MP3',
      importedAt: Date.now(),
    };

    set((state) => ({
      tracks: [...state.tracks, track],
      currentTrack: track,
    }));
  },

  analyzeTrack: async () => {
    set({ isAnalyzing: true });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const state = get();
    const duration = state.currentTrack?.duration || 180000;
    const analysis = generateMockAnalysis(duration);

    set({
      analysisResult: analysis,
      isAnalyzing: false,
      playback: { ...state.playback, duration: analysis.duration },
    });
  },

  autoMatchEffects: () => {
    const state = get();
    if (!state.analysisResult) return;

    const actions = autoMatchEffects(
      state.analysisResult,
      state.waterEffects,
      state.nozzleGroups
    );

    set((s) => ({
      currentScript: s.currentScript
        ? {
            ...s.currentScript,
            actions,
            updatedAt: Date.now(),
          }
        : null,
      isCalibrated: false,
    }));

    get().validateSafety();
  },

  calibrateTiming: () => {
    const state = get();
    if (!state.currentScript) return;

    const calibratedActions = applyDelayCompensation(
      state.currentScript.actions,
      state.nozzleGroups,
      state.physicalConfig
    );

    set((s) => ({
      currentScript: s.currentScript
        ? {
            ...s.currentScript,
            actions: calibratedActions,
            updatedAt: Date.now(),
          }
        : null,
      isCalibrated: true,
    }));

    get().validateSafety();
  },

  validateSafety: () => {
    const state = get();
    if (!state.currentScript) return;

    const flowStatuses = checkFlowCapacity(
      state.currentScript.actions,
      state.nozzleGroups,
      state.pumpConfig
    );

    const flowWarnings = generateFlowWarnings(flowStatuses);
    const waterHammerWarnings = checkWaterHammer(state.currentScript.actions);

    set({
      flowStatuses,
      warnings: [...flowWarnings, ...waterHammerWarnings],
    });
  },

  createNewScript: (name, category) => {
    const state = get();
    const newScript: ShowScript = {
      id: generateId('script'),
      name,
      trackId: state.currentTrack?.id || '',
      trackName: state.currentTrack?.name || '',
      artist: state.currentTrack?.artist || '',
      category,
      tags: [],
      duration: state.analysisResult?.duration || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '0.1.0',
      actions: [],
      nozzleGroups: state.nozzleGroups,
      analysisResult: state.analysisResult,
      performanceRecords: [],
    };

    set((s) => ({
      scripts: [newScript, ...s.scripts],
      currentScript: newScript,
    }));
  },

  saveScript: async () => {
    const state = get();
    if (!state.currentScript) return;

    set({ isSaving: true });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedScript = {
      ...state.currentScript,
      updatedAt: Date.now(),
      version: incrementVersion(state.currentScript.version),
    };

    set((s) => ({
      scripts: s.scripts.map((sc) =>
        sc.id === updatedScript.id ? updatedScript : sc
      ),
      currentScript: updatedScript,
      isSaving: false,
    }));
  },

  loadScript: (id) => {
    const state = get();
    const script = state.scripts.find((s) => s.id === id);

    if (script) {
      set({
        currentScript: script,
        analysisResult: script.analysisResult,
        nozzleGroups: script.nozzleGroups,
        playback: {
          ...state.playback,
          currentTime: 0,
          duration: script.duration,
          isPlaying: false,
        },
      });

      get().validateSafety();
    }
  },

  deleteScript: (id) => {
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
      currentScript: state.currentScript?.id === id ? null : state.currentScript,
    }));
  },

  exportScript: (id, path) => {
    const state = get();
    const script = state.scripts.find((s) => s.id === id);
    if (!script) return;

    const dataStr = JSON.stringify(script, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
  },

  updatePlaybackTime: (time) => {
    set((state) => ({
      playback: { ...state.playback, currentTime: time },
    }));
  },

  togglePlay: () => {
    set((state) => ({
      playback: { ...state.playback, isPlaying: !state.playback.isPlaying },
    }));
  },

  resetPlayback: () => {
    set((state) => ({
      playback: { ...state.playback, currentTime: 0, isPlaying: false },
    }));
  },

  resolveWarning: (id) => {
    set((state) => ({
      warnings: state.warnings.map((w) =>
        w.id === id ? { ...w, resolved: true } : w
      ),
    }));
  },

  clearWarnings: () => {
    set({ warnings: [] });
  },
}));

const incrementVersion = (version: string): string => {
  const parts = version.split('.').map(Number);
  if (parts.length === 3) {
    parts[2]++;
    if (parts[2] >= 10) {
      parts[2] = 0;
      parts[1]++;
    }
  }
  return parts.join('.');
};
