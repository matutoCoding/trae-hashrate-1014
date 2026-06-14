export interface AudioAnalysisResult {
  duration: number;
  bpm: number;
  beatTimes: number[];
  downbeatTimes: number[];
  frequencyBands: {
    low: number[];
    mid: number[];
    high: number[];
  };
  sections: MusicSection[];
  waveformData: number[];
}

export interface MusicSection {
  id: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  startTime: number;
  endTime: number;
  intensity: number;
}

export interface Nozzle {
  id: string;
  nozzleType: string;
  maxHeight: number;
  flowRate: number;
  angle: number;
  position: { x: number; y: number };
}

export interface NozzleGroup {
  id: string;
  name: string;
  nozzles: Nozzle[];
  valveType: 'on-off' | 'variable';
  maxFlowRate: number;
  responseTime: number;
  position: { x: number; y: number };
  color?: string;
}

export interface EffectParameter {
  name: string;
  type: 'number' | 'boolean' | 'select';
  min?: number;
  max?: number;
  defaultValue: any;
  options?: string[];
  unit?: string;
}

export interface WaterEffect {
  id: string;
  name: string;
  category: 'burst' | 'wave' | 'run' | 'fan' | 'column' | 'custom';
  description: string;
  parameters: EffectParameter[];
  previewFrames: number[][];
  color: string;
  icon: string;
}

export interface TimedAction {
  id: string;
  nozzleGroupId: string;
  effectId: string;
  startTime: number;
  duration: number;
  intensity: number;
  delayCompensation: number;
  parameters: Record<string, any>;
  sectionId?: string;
}

export interface SafetyWarning {
  id: string;
  type: 'flow' | 'waterhammer' | 'pressure';
  severity: 'warning' | 'critical';
  time: number;
  message: string;
  affectedGroups: string[];
  suggestion: string;
  resolved?: boolean;
}

export interface FlowStatus {
  time: number;
  totalFlow: number;
  maxCapacity: number;
  percentage: number;
  overflow: boolean;
  activeGroups: number;
}

export interface PerformanceRecord {
  id: string;
  timestamp: number;
  operator: string;
  venue: string;
  status: 'success' | 'partial' | 'failed';
  notes: string;
  anomalies: string[];
  duration: number;
}

export interface ShowScript {
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
  actions: TimedAction[];
  nozzleGroups: NozzleGroup[];
  analysisResult: AudioAnalysisResult | null;
  performanceRecords: PerformanceRecord[];
  coverImage?: string;
  description?: string;
}

export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  album?: string;
  duration: number;
  filePath: string;
  fileHash: string;
  fileSize: number;
  format: string;
  importedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface PumpConfig {
  maxCapacity: number;
  safetyMargin: number;
  responseTime: number;
  pressureRating: number;
}

export interface PhysicalConfig {
  gravity: number;
  valveResponseTime: number;
  pipeDiameter: number;
  waterDensity: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
  volume: number;
}

export interface GaugeData {
  value: number;
  max: number;
  min: number;
  label: string;
  unit: string;
  color: string;
}

export interface ScriptFilter {
  category?: string;
  search?: string;
  tags?: string[];
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'duration';
  sortOrder: 'asc' | 'desc';
}
