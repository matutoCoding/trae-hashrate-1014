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
  PerformanceRecord,
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
import {
  analyzeAudioFile,
  generateMockAnalysis,
  computeFileHash,
} from '../algorithm/audioAnalysis';
import { db } from '../db';

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
  isLoading: boolean;
  isCalibrated: boolean;
  isDbReady: boolean;

  initDatabase: () => Promise<void>;
  refreshScripts: () => Promise<void>;

  setCurrentScript: (script: ShowScript | null) => void;
  setCurrentTrack: (track: TrackInfo | null) => void;
  setAnalysisResult: (result: AudioAnalysisResult | null) => void;
  setSelectedAction: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;
  setPlayback: (state: Partial<PlaybackState>) => void;
  setPumpConfig: (config: Partial<PumpConfig>) => void;
  setPhysicalConfig: (config: Partial<PhysicalConfig>) => void;
  setScriptFilter: (filter: Partial<ScriptFilter>) => void;

  addAction: (action: Omit<TimedAction, 'id' | 'originalStartTime' | 'isCalibrated' | 'delayCompensation'>) => void;
  updateAction: (id: string, updates: Partial<TimedAction>) => void;
  deleteAction: (id: string) => void;
  duplicateAction: (id: string) => void;

  addNozzleGroup: (group: Omit<NozzleGroup, 'id'>) => void;
  updateNozzleGroup: (id: string, updates: Partial<NozzleGroup>) => void;
  deleteNozzleGroup: (id: string) => void;

  importAudioFile: (file: File) => Promise<void>;
  analyzeTrack: () => Promise<void>;
  autoMatchEffects: () => void;
  calibrateTiming: () => void;
  validateSafety: () => void;

  createNewScript: (name: string, category: string) => Promise<void>;
  saveScript: () => Promise<void>;
  loadScript: (id: string) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  exportScript: (id: string) => void;
  importScript: (file: File) => Promise<void>;

  recordPerformance: (record: Omit<PerformanceRecord, 'id'>) => void;

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
    const actions = autoMatchEffects(analysis, DEFAULT_WATER_EFFECTS, groups);
    const flowStatuses = checkFlowCapacity(actions, groups, DEFAULT_PUMP_CONFIG);
    const flowWarnings = generateFlowWarnings(flowStatuses);
    const waterHammerWarnings = checkWaterHammer(actions);
    const safetyWarnings = [...flowWarnings, ...waterHammerWarnings];

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
      actions,
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
      safetyWarnings,
      flowStatuses,
      description: `为《${track.name}》精心编排的水形方案`,
    });
  });

  return mockScripts;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentScript: null,
  scripts: [],
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
  isLoading: false,
  isCalibrated: false,
  isDbReady: false,

  initDatabase: async () => {
    try {
      const mockScripts = createMockScripts();
      const defaultSettings = {
        id: 'default',
        pumpConfig: DEFAULT_PUMP_CONFIG,
        physicalConfig: DEFAULT_PHYSICAL_CONFIG,
        categories: DEFAULT_CATEGORIES,
      };

      await db.initializeWithMockData(mockScripts, defaultSettings);
      const scripts = await db.getAllScripts();

      set({
        scripts,
        isDbReady: true,
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      set({
        scripts: createMockScripts(),
        isDbReady: true,
      });
    }
  },

  refreshScripts: async () => {
    try {
      const scripts = await db.getAllScripts();
      set({ scripts });
    } catch (error) {
      console.error('Failed to refresh scripts:', error);
    }
  },

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
      originalStartTime: action.startTime,
      delayCompensation: 0,
      isCalibrated: false,
    };

    set((state) => {
      const newActions = [...state.currentScript.actions, newAction];
      return {
        currentScript: state.currentScript
          ? {
              ...state.currentScript,
              actions: newActions,
              safetyWarnings: [],
              flowStatuses: [],
              updatedAt: Date.now(),
            }
          : null,
        warnings: [],
        flowStatuses: [],
      };
    });
  },

  updateAction: (id, updates) => {
    set((state) => {
      if (!state.currentScript) return { currentScript: null };

      const updatedActions = state.currentScript.actions.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, ...updates };
        if (updates.startTime !== undefined) {
          updated.originalStartTime = updates.startTime;
          updated.isCalibrated = false;
          updated.delayCompensation = 0;
        }
        return updated;
      });

      const hasActionChanges = updates.startTime !== undefined || 
                              updates.duration !== undefined ||
                              updates.intensity !== undefined ||
                              updates.nozzleGroupId !== undefined;

      return {
        currentScript: {
          ...state.currentScript,
          actions: updatedActions,
          safetyWarnings: hasActionChanges ? [] : state.currentScript.safetyWarnings,
          flowStatuses: hasActionChanges ? [] : state.currentScript.flowStatuses,
          updatedAt: Date.now(),
        },
        warnings: hasActionChanges ? [] : state.warnings,
        flowStatuses: hasActionChanges ? [] : state.flowStatuses,
      };
    });
  },

  deleteAction: (id) => {
    set((state) => ({
      currentScript: state.currentScript
        ? {
            ...state.currentScript,
            actions: state.currentScript.actions.filter((a) => a.id !== id),
            safetyWarnings: [],
            flowStatuses: [],
            updatedAt: Date.now(),
          }
        : null,
      selectedActionId: state.selectedActionId === id ? null : state.selectedActionId,
      warnings: [],
      flowStatuses: [],
    }));
  },

  duplicateAction: (id) => {
    const state = get();
    const action = state.currentScript?.actions.find((a) => a.id === id);
    if (!action) return;

    const newAction: TimedAction = {
      ...action,
      id: generateId('action'),
      startTime: action.originalStartTime + 500,
      originalStartTime: action.originalStartTime + 500,
    };

    set((s) => {
      const newActions = [...s.currentScript.actions, newAction];
      return {
        currentScript: s.currentScript
          ? {
              ...s.currentScript,
              actions: newActions,
              safetyWarnings: [],
              flowStatuses: [],
              updatedAt: Date.now(),
            }
          : null,
        warnings: [],
        flowStatuses: [],
      };
    });
  },

  addNozzleGroup: (group) => {
    const newGroup: NozzleGroup = {
      ...group,
      id: generateId('group'),
    };

    set((state) => {
      const newNozzleGroups = [...state.nozzleGroups, newGroup];
      return {
        nozzleGroups: newNozzleGroups,
        currentScript: state.currentScript
          ? {
              ...state.currentScript,
              nozzleGroups: newNozzleGroups,
              updatedAt: Date.now(),
            }
          : null,
      };
    });
  },

  updateNozzleGroup: (id, updates) => {
    set((state) => {
      const newNozzleGroups = state.nozzleGroups.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      );

      return {
        nozzleGroups: newNozzleGroups,
        currentScript: state.currentScript
          ? {
              ...state.currentScript,
              nozzleGroups: newNozzleGroups,
              updatedAt: Date.now(),
            }
          : null,
      };
    });
  },

  deleteNozzleGroup: (id) => {
    set((state) => {
      const newNozzleGroups = state.nozzleGroups.filter((g) => g.id !== id);
      return {
        nozzleGroups: newNozzleGroups,
        selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
        currentScript: state.currentScript
          ? {
              ...state.currentScript,
              nozzleGroups: newNozzleGroups,
              updatedAt: Date.now(),
            }
          : null,
      };
    });
  },

  importAudioFile: async (file) => {
    set({ isAnalyzing: true, analysisResult: null });

    try {
      const fileHash = await computeFileHash(file);
      const analysis = await analyzeAudioFile(file);

      const track: TrackInfo = {
        id: generateId('track'),
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: '未知艺术家',
        album: '',
        duration: analysis.duration,
        filePath: file.name,
        fileHash,
        fileSize: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || 'MP3',
        importedAt: Date.now(),
      };

      set((state) => ({
        tracks: [...state.tracks, track],
        currentTrack: track,
        analysisResult: analysis,
        isAnalyzing: false,
        playback: { ...state.playback, duration: analysis.duration },
      }));
    } catch (error) {
      console.error('Failed to analyze audio:', error);
      set({ isAnalyzing: false });
      throw error;
    }
  },

  analyzeTrack: async () => {
    set({ isAnalyzing: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const state = get();
    if (state.analysisResult) {
      set({ isAnalyzing: false });
      return;
    }
    set({ isAnalyzing: false });
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
            safetyWarnings: [],
            flowStatuses: [],
            updatedAt: Date.now(),
          }
        : null,
      isCalibrated: false,
      warnings: [],
      flowStatuses: [],
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
            safetyWarnings: [],
            flowStatuses: [],
            updatedAt: Date.now(),
          }
        : null,
      isCalibrated: true,
      warnings: [],
      flowStatuses: [],
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
    const warnings = [...flowWarnings, ...waterHammerWarnings];

    set((s) => ({
      flowStatuses,
      warnings,
      currentScript: s.currentScript
        ? {
            ...s.currentScript,
            safetyWarnings: warnings,
            flowStatuses,
            updatedAt: Date.now(),
          }
        : null,
    }));
  },

  createNewScript: async (name, category) => {
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
      nozzleGroups: [...state.nozzleGroups],
      analysisResult: state.analysisResult,
      performanceRecords: [],
      safetyWarnings: [],
      flowStatuses: [],
    };

    try {
      if (state.isDbReady) {
        await db.saveScript(newScript);
        const scripts = await db.getAllScripts();
        set({
          scripts,
          currentScript: newScript,
        });
      } else {
        set((s) => ({
          scripts: [newScript, ...s.scripts],
          currentScript: newScript,
        }));
      }
    } catch (error) {
      console.error('Failed to auto-save new script:', error);
      set((s) => ({
        scripts: [newScript, ...s.scripts],
        currentScript: newScript,
      }));
    }
  },

  saveScript: async () => {
    const state = get();
    if (!state.currentScript) return;

    set({ isSaving: true });

    try {
      const updatedScript = {
        ...state.currentScript,
        updatedAt: Date.now(),
        version: incrementVersion(state.currentScript.version),
        nozzleGroups: state.nozzleGroups,
        safetyWarnings: state.warnings,
        flowStatuses: state.flowStatuses,
      };

      if (state.isDbReady) {
        await db.saveScript(updatedScript);
        const scripts = await db.getAllScripts();
        set({
          scripts,
          currentScript: updatedScript,
          isSaving: false,
        });
      } else {
        set({
          currentScript: updatedScript,
          isSaving: false,
        });
      }
    } catch (error) {
      console.error('Failed to save script:', error);
      set({ isSaving: false });
    }
  },

  loadScript: async (id) => {
    set({ isLoading: true });

    try {
      let script: ShowScript | null = null;

      if (get().isDbReady) {
        script = await db.getScriptById(id);
      }

      if (!script) {
        script = get().scripts.find((s) => s.id === id) || null;
      }

      if (script) {
        set({
          currentScript: script,
          analysisResult: script.analysisResult,
          nozzleGroups: script.nozzleGroups,
          warnings: script.safetyWarnings || [],
          flowStatuses: script.flowStatuses || [],
          playback: {
            ...get().playback,
            currentTime: 0,
            duration: script.duration,
            isPlaying: false,
          },
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to load script:', error);
      set({ isLoading: false });
    }
  },

  deleteScript: async (id) => {
    try {
      if (get().isDbReady) {
        await db.deleteScript(id);
        const scripts = await db.getAllScripts();
        set({
          scripts,
          currentScript: get().currentScript?.id === id ? null : get().currentScript,
        });
      } else {
        set((state) => ({
          scripts: state.scripts.filter((s) => s.id !== id),
          currentScript: state.currentScript?.id === id ? null : state.currentScript,
        }));
      }
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  },

  exportScript: (id) => {
    const state = get();

    if (state.currentScript && state.currentScript.id === id) {
      const scriptToExport = {
        ...state.currentScript,
        nozzleGroups: state.nozzleGroups,
        safetyWarnings: state.warnings,
        flowStatuses: state.flowStatuses,
      };
      downloadScript(scriptToExport);
      return;
    }

    const script = state.scripts.find((s) => s.id === id);
    if (script) {
      downloadScript(script);
    }
  },

  importScript: async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const importedNozzleGroups = Array.isArray(data.nozzleGroups)
        ? data.nozzleGroups.map((g: any) => ({
            ...g,
            oldId: g.id,
            id: generateId('group'),
            nozzles: g.nozzles || [],
          }))
        : generateDefaultNozzleGroups().map((g) => ({ ...g, oldId: g.id }));

      const groupIdMap = new Map<string, string>();
      importedNozzleGroups.forEach((g: any) => {
        if (g.oldId) {
          groupIdMap.set(g.oldId, g.id);
        }
      });

      importedNozzleGroups.forEach((g: any) => { delete g.oldId; });

      const importedScript: ShowScript = {
        id: generateId('script'),
        name: data.name || file.name.replace(/\.[^/.]+$/, ''),
        trackId: data.trackId || generateId('imported-track'),
        trackName: data.trackName || '导入曲目',
        artist: data.artist || '未知艺术家',
        category: data.category || 'classic',
        tags: data.tags || [],
        duration: data.duration || 180000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: data.version || '1.0.0',
        actions: Array.isArray(data.actions) ? data.actions.map((a: any) => ({
          ...a,
          id: generateId('action'),
          nozzleGroupId: groupIdMap.get(a.nozzleGroupId) || a.nozzleGroupId,
          originalStartTime: a.originalStartTime ?? a.startTime,
          delayCompensation: a.delayCompensation || 0,
          isCalibrated: a.isCalibrated ?? false,
        })) : [],
        nozzleGroups: importedNozzleGroups,
        analysisResult: data.analysisResult || null,
        performanceRecords: Array.isArray(data.performanceRecords) ? data.performanceRecords : [],
        safetyWarnings: Array.isArray(data.safetyWarnings) ? data.safetyWarnings.map((w: any) => ({
          ...w,
          id: generateId('warning'),
        })) : [],
        flowStatuses: Array.isArray(data.flowStatuses) ? data.flowStatuses : [],
        description: data.description || '',
      };

      if (get().isDbReady) {
        await db.saveScript(importedScript);
        const scripts = await db.getAllScripts();
        set((state) => ({
          scripts,
          currentScript: importedScript,
          analysisResult: importedScript.analysisResult,
          nozzleGroups: importedScript.nozzleGroups,
          warnings: importedScript.safetyWarnings,
          flowStatuses: importedScript.flowStatuses,
          playback: {
            ...state.playback,
            duration: importedScript.duration,
          },
        }));
      } else {
        set((state) => ({
          scripts: [importedScript, ...state.scripts],
          currentScript: importedScript,
          analysisResult: importedScript.analysisResult,
          nozzleGroups: importedScript.nozzleGroups,
          warnings: importedScript.safetyWarnings,
          flowStatuses: importedScript.flowStatuses,
          playback: {
            ...state.playback,
            duration: importedScript.duration,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to import script:', error);
      throw error;
    }
  },

  recordPerformance: (record) => {
    const newRecord: PerformanceRecord = {
      ...record,
      id: generateId('perf'),
    };

    set((state) => {
      if (!state.currentScript) return { currentScript: null };

      const updatedScript = {
        ...state.currentScript,
        performanceRecords: [...state.currentScript.performanceRecords, newRecord],
        updatedAt: Date.now(),
      };

      return {
        currentScript: updatedScript,
      };
    });

    if (get().isDbReady && get().currentScript) {
      db.saveScript(get().currentScript!);
    }
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
    set((state) => {
      const updatedWarnings = state.warnings.map((w) =>
        w.id === id ? { ...w, resolved: true } : w
      );

      return {
        warnings: updatedWarnings,
        currentScript: state.currentScript
          ? {
              ...state.currentScript,
              safetyWarnings: updatedWarnings,
              updatedAt: Date.now(),
            }
          : null,
      };
    });
  },

  clearWarnings: () => {
    set({ warnings: [] });
  },
}));

const downloadScript = (script: ShowScript) => {
  const exportData = {
    ...script,
    exportedAt: Date.now(),
    exportedFrom: 'Fountain Choreography Studio',
    version: '1.0.0',
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.name}.fountain.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
