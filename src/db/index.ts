import Dexie, { Table } from 'dexie';
import {
  ShowScript,
  NozzleGroup,
  TimedAction,
  PerformanceRecord,
  AudioAnalysisResult,
  Category,
  PumpConfig,
  PhysicalConfig,
} from '@/types';

export interface ScriptRecord {
  id: string;
  name: string;
  trackId: string;
  trackName: string;
  artist: string;
  category: string;
  tags: string[];
  duration: number;
  createdAt: number;
  updatedAt: number;
  version: string;
  description?: string;
  coverImage?: string;
  nozzleGroups: NozzleGroup[];
  actions: TimedAction[];
  analysisResult: AudioAnalysisResult | null;
  performanceRecords: PerformanceRecord[];
}

export interface SettingsRecord {
  id: string;
  pumpConfig: PumpConfig;
  physicalConfig: PhysicalConfig;
  categories: Category[];
  lastOpenedScriptId?: string;
}

class FountainDatabase extends Dexie {
  scripts!: Table<ScriptRecord, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('fountain-studio');

    this.version(1).stores({
      scripts: 'id, name, category, trackName, artist, createdAt, updatedAt, duration',
      settings: 'id',
    });
  }

  async getAllScripts(): Promise<ShowScript[]> {
    const records = await this.scripts.orderBy('updatedAt').reverse().toArray();
    return records.map(recordToScript);
  }

  async getScriptById(id: string): Promise<ShowScript | null> {
    const record = await this.scripts.get(id);
    return record ? recordToScript(record) : null;
  }

  async saveScript(script: ShowScript): Promise<void> {
    const record = scriptToRecord(script);
    await this.scripts.put(record);
  }

  async deleteScript(id: string): Promise<void> {
    await this.scripts.delete(id);
  }

  async getSettings(): Promise<SettingsRecord | null> {
    return (await this.settings.get('default')) || null;
  }

  async saveSettings(settings: Partial<SettingsRecord>): Promise<void> {
    const existing = await this.getSettings();
    await this.settings.put({
      id: 'default',
      pumpConfig: settings.pumpConfig || existing?.pumpConfig,
      physicalConfig: settings.physicalConfig || existing?.physicalConfig,
      categories: settings.categories || existing?.categories || [],
      lastOpenedScriptId: settings.lastOpenedScriptId ?? existing?.lastOpenedScriptId,
    });
  }

  async initializeWithMockData(mockScripts: ShowScript[], defaultSettings: SettingsRecord): Promise<void> {
    const count = await this.scripts.count();
    if (count === 0) {
      for (const script of mockScripts) {
        await this.saveScript(script);
      }
    }

    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.put(defaultSettings);
    }
  }
}

function recordToScript(record: ScriptRecord): ShowScript {
  return {
    id: record.id,
    name: record.name,
    trackId: record.trackId,
    trackName: record.trackName,
    artist: record.artist,
    category: record.category,
    tags: record.tags,
    duration: record.duration,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
    description: record.description,
    coverImage: record.coverImage,
    nozzleGroups: record.nozzleGroups,
    actions: record.actions,
    analysisResult: record.analysisResult,
    performanceRecords: record.performanceRecords,
  };
}

function scriptToRecord(script: ShowScript): ScriptRecord {
  return {
    id: script.id,
    name: script.name,
    trackId: script.trackId,
    trackName: script.trackName,
    artist: script.artist,
    category: script.category,
    tags: script.tags,
    duration: script.duration,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
    version: script.version,
    description: script.description,
    coverImage: script.coverImage,
    nozzleGroups: script.nozzleGroups,
    actions: script.actions,
    analysisResult: script.analysisResult,
    performanceRecords: script.performanceRecords,
  };
}

export const db = new FountainDatabase();
export default db;
