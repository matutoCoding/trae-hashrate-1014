import { WaterEffect, Category, NozzleGroup, PumpConfig, PhysicalConfig } from '../types';

export const APP_NAME = '音乐喷泉编排工作室';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  primary: '#0A1628',
  secondary: '#1A2942',
  accent: '#00F0FF',
  warning: '#FF6B35',
  success: '#00D26A',
  error: '#FF3B30',
  text: '#E8F0F8',
  textMuted: '#8A9CB3',
  border: '#2A3F5F',
  grid: '#152238',
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'classic', name: '古典音乐', color: '#8A9CB3', icon: 'Music2' },
  { id: 'pop', name: '流行音乐', color: '#00F0FF', icon: 'Disc' },
  { id: 'rock', name: '摇滚音乐', color: '#FF6B35', icon: 'Guitar' },
  { id: 'electronic', name: '电子音乐', color: '#00D26A', icon: 'Headphones' },
  { id: 'folk', name: '民族音乐', color: '#E8A87C', icon: 'Drum' },
  { id: 'festival', name: '节日庆典', color: '#FFD93D', icon: 'PartyPopper' },
];

export const generatePreviewFrames = (pattern: string): number[][] => {
  const frames: number[][] = [];
  const frameCount = 30;
  const nozzleCount = 10;

  for (let f = 0; f < frameCount; f++) {
    const frame: number[] = [];
    const t = f / frameCount;

    for (let n = 0; n < nozzleCount; n++) {
      const nt = n / nozzleCount;
      let value = 0;

      switch (pattern) {
        case 'burst':
          value = Math.sin(t * Math.PI) * Math.exp(-Math.pow(t - 0.5, 2) * 8);
          break;
        case 'wave':
          value = Math.sin((t - nt) * Math.PI * 2) * 0.5 + 0.5;
          break;
        case 'run':
          const runPos = t * nozzleCount;
          value = Math.exp(-Math.pow(n - runPos, 2) * 0.5);
          break;
        case 'fan':
          const center = nozzleCount / 2;
          const spread = Math.sin(t * Math.PI) * nozzleCount * 0.4;
          value = Math.abs(n - center) < spread ? 1 - Math.abs(n - center) / spread : 0;
          break;
        case 'column':
          value = 0.3 + Math.sin(t * Math.PI * 2) * 0.3;
          break;
        default:
          value = 0.5;
      }

      frame.push(Math.max(0, Math.min(1, value)));
    }
    frames.push(frame);
  }

  return frames;
};

export const DEFAULT_WATER_EFFECTS: WaterEffect[] = [
  {
    id: 'burst-simultaneous',
    name: '齐射',
    category: 'burst',
    description: '所有喷头同时喷射，形成整齐划一的水柱阵列',
    color: '#00F0FF',
    icon: 'Zap',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 80, unit: '%' },
      { name: 'riseTime', type: 'number', min: 0, max: 2000, defaultValue: 500, unit: 'ms' },
      { name: 'fallTime', type: 'number', min: 0, max: 2000, defaultValue: 800, unit: 'ms' },
    ],
    previewFrames: generatePreviewFrames('burst'),
  },
  {
    id: 'wave-horizontal',
    name: '横向波浪',
    category: 'wave',
    description: '从左到右依次开启，形成波浪滚动效果',
    color: '#00D26A',
    icon: 'Waves',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 70, unit: '%' },
      { name: 'waveSpeed', type: 'number', min: 0.5, max: 5, defaultValue: 2, unit: 'm/s' },
      { name: 'phaseOffset', type: 'number', min: 0, max: 360, defaultValue: 0, unit: '°' },
    ],
    previewFrames: generatePreviewFrames('wave'),
  },
  {
    id: 'run-chase',
    name: '跑动追逐',
    category: 'run',
    description: '相邻喷头依次点亮，形成跑动光影效果',
    color: '#FFD93D',
    icon: 'MoveRight',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 60, unit: '%' },
      { name: 'speed', type: 'number', min: 0.1, max: 10, defaultValue: 3, unit: '组/s' },
      { name: 'trailLength', type: 'number', min: 1, max: 20, defaultValue: 5, unit: '组' },
    ],
    previewFrames: generatePreviewFrames('run'),
  },
  {
    id: 'fan-spread',
    name: '扇形展开',
    category: 'fan',
    description: '从中心向两侧展开成扇形',
    color: '#E8A87C',
    icon: 'Fan',
    parameters: [
      { name: 'maxHeight', type: 'number', min: 0, max: 100, defaultValue: 90, unit: '%' },
      { name: 'spreadAngle', type: 'number', min: 30, max: 180, defaultValue: 120, unit: '°' },
      { name: 'nozzleCount', type: 'number', min: 5, max: 50, defaultValue: 15 },
    ],
    previewFrames: generatePreviewFrames('fan'),
  },
  {
    id: 'column-pulse',
    name: '水柱脉动',
    category: 'column',
    description: '单组水柱高低起伏脉动',
    color: '#FF6B35',
    icon: 'Activity',
    parameters: [
      { name: 'baseHeight', type: 'number', min: 0, max: 100, defaultValue: 40, unit: '%' },
      { name: 'pulseHeight', type: 'number', min: 0, max: 100, defaultValue: 80, unit: '%' },
      { name: 'pulseRate', type: 'number', min: 0.5, max: 5, defaultValue: 1, unit: 'Hz' },
    ],
    previewFrames: generatePreviewFrames('column'),
  },
  {
    id: 'burst-ripple',
    name: '涟漪扩散',
    category: 'burst',
    description: '从中心向外涟漪式扩散',
    color: '#9B59B6',
    icon: 'CircleDot',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 75, unit: '%' },
      { name: 'rippleSpeed', type: 'number', min: 1, max: 10, defaultValue: 4, unit: 'm/s' },
      { name: 'rippleCount', type: 'number', min: 1, max: 5, defaultValue: 2 },
    ],
    previewFrames: generatePreviewFrames('burst'),
  },
  {
    id: 'wave-vertical',
    name: '纵向波浪',
    category: 'wave',
    description: '从前到后依次开启，形成纵向波浪',
    color: '#3498DB',
    icon: 'ArrowUp',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 65, unit: '%' },
      { name: 'waveSpeed', type: 'number', min: 0.5, max: 5, defaultValue: 2.5, unit: 'm/s' },
      { name: 'amplitude', type: 'number', min: 10, max: 100, defaultValue: 50, unit: '%' },
    ],
    previewFrames: generatePreviewFrames('wave'),
  },
  {
    id: 'run-bounce',
    name: '弹跳跑动',
    category: 'run',
    description: '喷头交替弹跳，形成弹性跑动效果',
    color: '#1ABC9C',
    icon: 'TrendingUp',
    parameters: [
      { name: 'height', type: 'number', min: 0, max: 100, defaultValue: 70, unit: '%' },
      { name: 'speed', type: 'number', min: 0.5, max: 8, defaultValue: 4, unit: '组/s' },
      { name: 'bounceHeight', type: 'number', min: 0, max: 100, defaultValue: 30, unit: '%' },
    ],
    previewFrames: generatePreviewFrames('run'),
  },
];

export const generateDefaultNozzleGroups = (): NozzleGroup[] => {
  const groupColors = ['#00F0FF', '#FF6B35', '#00D26A', '#FFD93D', '#9B59B6', '#E8A87C', '#3498DB', '#1ABC9C'];
  const groups: NozzleGroup[] = [];

  for (let i = 0; i < 8; i++) {
    const nozzles = [];
    const nozzleCount = i < 4 ? 12 : 8;

    for (let j = 0; j < nozzleCount; j++) {
      nozzles.push({
        id: `nozzle-${i}-${j}`,
        nozzleType: i < 4 ? 'variable' : 'on-off',
        maxHeight: i < 4 ? 30 : 20,
        flowRate: i < 4 ? 120 : 80,
        angle: 90,
        position: {
          x: (j - nozzleCount / 2) * 0.8,
          y: (i - 4) * 2,
        },
      });
    }

    groups.push({
      id: `group-${i}`,
      name: `${['主喷区A', '主喷区B', '主喷区C', '主喷区D', '侧喷区A', '侧喷区B', '跑马灯A', '跑马灯B'][i]}`,
      nozzles,
      valveType: i < 4 ? 'variable' : 'on-off',
      maxFlowRate: nozzleCount * (i < 4 ? 120 : 80),
      responseTime: i < 4 ? 150 : 80,
      position: { x: 0, y: (i - 4) * 2 },
      color: groupColors[i],
    });
  }

  return groups;
};

export const DEFAULT_PUMP_CONFIG: PumpConfig = {
  maxCapacity: 8000,
  safetyMargin: 0.9,
  responseTime: 500,
  pressureRating: 1.6,
};

export const DEFAULT_PHYSICAL_CONFIG: PhysicalConfig = {
  gravity: 9.8,
  valveResponseTime: 100,
  pipeDiameter: 0.2,
  waterDensity: 1000,
};

export const SECTION_TYPES = [
  { type: 'intro', name: '前奏', color: '#8A9CB3' },
  { type: 'verse', name: '主歌', color: '#00F0FF' },
  { type: 'chorus', name: '副歌', color: '#FF6B35' },
  { type: 'bridge', name: '桥段', color: '#00D26A' },
  { type: 'outro', name: '尾声', color: '#FFD93D' },
];

export const ANIMATION_PRESETS = [
  { id: 'beat-sync', name: '节拍同步', description: '水形与重拍严格对齐' },
  { id: 'melody-follow', name: '旋律跟随', description: '水柱高度随旋律变化' },
  { id: 'bass-drive', name: '低音驱动', description: '大鼓点触发大喷射' },
  { id: 'crescendo', name: '渐强模式', description: '逐步增加喷射强度' },
  { id: 'call-response', name: '呼应模式', description: '左右区域交替呼应' },
];

export const TIMELINE_CONFIG = {
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 10,
  DEFAULT_ZOOM: 1,
  SNAP_INTERVAL: 50,
  PIXELS_PER_SECOND: 100,
  TRACK_HEIGHT: 48,
  CURSOR_WIDTH: 2,
};

export const FILE_FORMATS = {
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
  script: ['.fountain', '.json'],
  export: ['.json', '.fountain', '.csv'],
};
