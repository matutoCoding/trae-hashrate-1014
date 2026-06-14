import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Eye,
  Camera,
  Grid3X3,
  Layers,
  Maximize2,
  Sparkles,
  FileVideo,
  ArrowRight,
} from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PlaybackControls } from '@/components/common/PlaybackControls';
import { Gauge as GaugeComponent, StatusIndicator, BarGauge } from '@/components/Dashboard/Gauges';
import { useAppStore } from '@/store/useAppStore';
import { NozzleGroup, TimedAction } from '@/types';
import { formatTime, cn } from '@/utils/helpers';

interface WaterJetProps {
  position: [number, number, number];
  height: number;
  color: string;
  intensity: number;
}

const WaterJet: React.FC<WaterJetProps> = ({ position, height, color, intensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 0.15, height, 8);
    geo.translate(0, height / 2, 0);
    return geo;
  }, [height]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7 * intensity,
      metalness: 0.1,
      roughness: 0.1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3 * intensity,
    });
  }, [color, intensity]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const wobble = Math.sin(Date.now() * 0.005 + position[0]) * 0.02;
      meshRef.current.position.x = position[0] + wobble;
      meshRef.current.position.z = position[2] + wobble * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry} material={material}>
      <pointLight
        position={[0, height * 0.8, 0]}
        color={color}
        intensity={intensity * 2}
        distance={height * 2}
      />
    </mesh>
  );
};

interface NozzleGroupMeshProps {
  group: NozzleGroup;
  actions: TimedAction[];
  currentTime: number;
}

const NozzleGroupMesh: React.FC<NozzleGroupMeshProps> = ({ group, actions, currentTime }) => {
  const activeActions = actions.filter(
    (a) =>
      a.nozzleGroupId === group.id &&
      currentTime >= a.startTime &&
      currentTime <= a.startTime + a.duration
  );

  const totalIntensity = activeActions.reduce((sum, a) => sum + a.intensity, 0);
  const maxHeight = activeActions.reduce(
    (max, a) => Math.max(max, (a.parameters.height || 50) / 100 * group.nozzles[0]?.maxHeight || 10),
    0
  );
  const isActive = activeActions.length > 0;

  return (
    <group position={[group.position.x, 0, group.position.y]}>
      {group.nozzles.map((nozzle, idx) => {
        const offsetX = nozzle.position.x;
        const offsetZ = nozzle.position.y;
        const phaseOffset = idx * 0.1;
        const timeOffset = isActive ? Math.sin(currentTime * 0.003 + phaseOffset) * 0.2 : 0;
        const height = isActive ? Math.max(0.5, maxHeight * (0.8 + timeOffset)) : 0.1;
        const intensity = isActive ? Math.min(1, totalIntensity / activeActions.length) : 0.1;

        return (
          <WaterJet
            key={nozzle.id}
            position={[offsetX, 0, offsetZ]}
            height={height}
            color={group.color || '#00F0FF'}
            intensity={intensity}
          />
        );
      })}
    </group>
  );
};

interface FountainSceneProps {
  nozzleGroups: NozzleGroup[];
  actions: TimedAction[];
  currentTime: number;
}

const FountainScene: React.FC<FountainSceneProps> = ({ nozzleGroups, actions, currentTime }) => {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 30, 0]} intensity={0.5} color="#ffffff" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[25, 64]} />
        <meshStandardMaterial
          color="#0A1628"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[18, 20, 64]} />
        <meshStandardMaterial
          color="#1A2942"
          metalness={0.9}
          roughness={0.1}
          emissive="#00F0FF"
          emissiveIntensity={0.1}
        />
      </mesh>

      {nozzleGroups.map((group) => (
        <NozzleGroupMesh
          key={group.id}
          group={group}
          actions={actions}
          currentTime={currentTime}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
};

export const PlaybackPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'3d' | 'timeline'>('3d');
  const [showGrid, setShowGrid] = useState(true);

  const currentScript = useAppStore((state) => state.currentScript);
  const analysisResult = useAppStore((state) => state.analysisResult);
  const nozzleGroups = useAppStore((state) => state.nozzleGroups);
  const playback = useAppStore((state) => state.playback);
  const warnings = useAppStore((state) => state.warnings);

  const setPlayback = useAppStore((state) => state.setPlayback);
  const updatePlaybackTime = useAppStore((state) => state.updatePlaybackTime);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const saveScript = useAppStore((state) => state.saveScript);

  const unresolvedWarnings = warnings.filter((w) => !w.resolved);

  const activeGroupsNow = useMemo(() => {
    if (!currentScript) return 0;
    return currentScript.actions.filter(
      (a) =>
        playback.currentTime >= a.startTime &&
        playback.currentTime <= a.startTime + a.duration
    ).length;
  }, [currentScript, playback.currentTime]);

  const currentSection = useMemo(() => {
    if (!analysisResult) return null;
    return analysisResult.sections.find(
      (s) => playback.currentTime >= s.startTime && playback.currentTime <= s.endTime
    );
  }, [analysisResult, playback.currentTime]);

  useEffect(() => {
    if (!playback.isPlaying || !currentScript) return;

    const interval = setInterval(() => {
      const newTime = playback.currentTime + 16 * playback.speed;
      if (newTime >= playback.duration) {
        if (playback.loop) {
          updatePlaybackTime(0);
        } else {
          setPlayback({ isPlaying: false });
          updatePlaybackTime(playback.duration);
        }
      } else {
        updatePlaybackTime(newTime);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [playback.isPlaying, playback.currentTime, playback.speed, playback.loop, playback.duration, currentScript]);

  const handleSavePerformance = async () => {
    if (!currentScript) return;

    const record = {
      id: `perf-${Date.now()}`,
      timestamp: Date.now(),
      operator: '当前用户',
      venue: '模拟演出',
      status: 'success' as const,
      notes: '预演回放完成',
      anomalies: [],
      duration: playback.duration,
    };

    currentScript.performanceRecords.push(record);
    await saveScript();
  };

  if (!currentScript || !analysisResult) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileVideo className="w-16 h-16 text-industrial-muted mx-auto mb-4" />
          <p className="text-industrial-text font-mono">请先创建并校准编排脚本</p>
          <button
            onClick={() => navigate('/calibration')}
            className="industrial-button-primary mt-4"
          >
            前往时序校准
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-industrial-border bg-industrial-panel flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('3d')}
              className={cn(
                'industrial-button flex items-center gap-2 text-xs',
                viewMode === '3d' && 'border-accent text-accent'
              )}
            >
              <Eye className="w-4 h-4" />
              3D视图
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'industrial-button flex items-center gap-2 text-xs',
                viewMode === 'timeline' && 'border-accent text-accent'
              )}
            >
              <Layers className="w-4 h-4" />
              时序视图
            </button>
          </div>

          <div className="h-6 w-px bg-industrial-border" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              'industrial-button flex items-center gap-2 text-xs',
              showGrid && 'border-accent/50 text-accent'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
            网格
          </button>

          <button
            onClick={() => {}}
            className="industrial-button flex items-center gap-2 text-xs"
          >
            <Camera className="w-4 h-4" />
            相机
          </button>

          <button
            onClick={() => {}}
            className="industrial-button flex items-center gap-2 text-xs"
          >
            <Maximize2 className="w-4 h-4" />
            全屏
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentSection && (
            <div className="px-3 py-1 rounded-full bg-industrial-bg border border-industrial-border">
              <span className="text-[10px] text-industrial-muted mr-2">当前段落</span>
              <span
                className="font-mono text-sm"
                style={{ color: currentSection.type === 'chorus' ? '#FF6B35' : '#00F0FF' }}
              >
                {currentSection.type === 'intro' && '前奏'}
                {currentSection.type === 'verse' && '主歌'}
                {currentSection.type === 'chorus' && '副歌'}
                {currentSection.type === 'bridge' && '桥段'}
                {currentSection.type === 'outro' && '尾声'}
              </span>
            </div>
          )}

          {unresolvedWarnings.length > 0 && (
            <div className="px-3 py-1 rounded-full bg-warning/10 border border-warning/30">
              <span className="text-xs text-warning">{unresolvedWarnings.length} 个警告</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 flex-shrink-0 border-r border-industrial-border bg-industrial-panel flex flex-col">
          <div className="p-4 border-b border-industrial-border">
            <h3 className="industrial-label mb-4">实时监控</h3>
            <div className="grid grid-cols-2 gap-3">
              <GaugeComponent
                data={{
                  value: activeGroupsNow,
                  max: nozzleGroups.length,
                  min: 0,
                  label: '活跃组',
                  unit: '组',
                  color: '#00F0FF',
                }}
                size={80}
              />
              <GaugeComponent
                data={{
                  value: Math.round(playback.currentTime / 1000),
                  max: Math.ceil(playback.duration / 1000),
                  min: 0,
                  label: '播放进度',
                  unit: 's',
                  color: '#00D26A',
                }}
                size={80}
              />
            </div>
          </div>

          <div className="p-4 border-b border-industrial-border">
            <h4 className="industrial-label mb-3">状态指示</h4>
            <div className="space-y-2">
              <StatusIndicator
                status={playback.isPlaying ? 'active' : 'idle'}
                label="播放状态"
                value={playback.isPlaying ? '播放中' : '已暂停'}
              />
              <StatusIndicator
                status={activeGroupsNow > 0 ? 'active' : 'idle'}
                label="喷射状态"
                value={activeGroupsNow > 0 ? '喷射中' : '待机'}
              />
              <StatusIndicator
                status={unresolvedWarnings.length > 0 ? 'warning' : 'active'}
                label="安全状态"
                value={unresolvedWarnings.length > 0 ? '有警告' : '正常'}
              />
            </div>
          </div>

          <div className="p-4 border-b border-industrial-border">
            <h4 className="industrial-label mb-3">流量监控</h4>
            <div className="space-y-3">
              <BarGauge
                value={activeGroupsNow * 600}
                max={8000}
                label="瞬时流量"
                unit="L/min"
                color="#00F0FF"
              />
              <BarGauge
                value={Math.round((playback.currentTime / playback.duration) * 100)}
                max={100}
                label="播放进度"
                unit="%"
                color="#00D26A"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <h4 className="industrial-label mb-3">喷头组状态</h4>
            <div className="space-y-2">
              {nozzleGroups.map((group) => {
                const isActive = currentScript.actions.some(
                  (a) =>
                    a.nozzleGroupId === group.id &&
                    playback.currentTime >= a.startTime &&
                    playback.currentTime <= a.startTime + a.duration
                );
                return (
                  <div
                    key={group.id}
                    className={cn(
                      'p-2 rounded-md border flex items-center gap-2 transition-all',
                      isActive
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-industrial-bg border-industrial-border'
                    )}
                  >
                    <div
                      className={cn('status-indicator', isActive ? 'status-active' : 'status-idle')}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-xs text-industrial-text font-mono flex-1 truncate">
                      {group.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-accent">ACTIVE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === '3d' ? (
            <div className="flex-1 relative">
              <Canvas
                camera={{ position: [0, 20, 25], fov: 60 }}
                gl={{ antialias: true, alpha: false }}
              >
                <color attach="background" args={['#0A1628']} />
                <fog attach="fog" args={['#0A1628', 30, 60]} />
                <FountainScene
                  nozzleGroups={nozzleGroups}
                  actions={currentScript.actions}
                  currentTime={playback.currentTime}
                />
              </Canvas>

              <div className="absolute top-4 left-4 industrial-panel p-3 bg-opacity-90">
                <h4 className="font-display text-sm text-accent mb-2">{currentScript.name}</h4>
                <p className="text-xs text-industrial-muted">
                  {currentScript.trackName} - {currentScript.artist}
                </p>
                <p className="text-[10px] text-industrial-muted mt-1">
                  {currentScript.actions.length} 个动作
                </p>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <div className="industrial-panel px-3 py-2 bg-opacity-90">
                  <span className="font-display text-2xl text-accent glow-text">
                    {formatTime(playback.currentTime)}
                  </span>
                </div>
                <div className="industrial-panel px-3 py-2 bg-opacity-90">
                  <span className="text-xs text-industrial-muted">速度 </span>
                  <span className="font-mono text-sm text-accent">{playback.speed}x</span>
                </div>
              </div>

              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid-bg opacity-30" />
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-auto">
              <div className="industrial-panel p-4">
                <h3 className="industrial-label mb-4">时序可视化</h3>
                <div className="space-y-2">
                  {nozzleGroups.map((group) => {
                    const groupActions = currentScript.actions.filter(
                      (a) => a.nozzleGroupId === group.id
                    );
                    return (
                      <div key={group.id} className="flex gap-3">
                        <div className="w-32 flex-shrink-0 flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="text-xs text-industrial-text font-mono truncate">
                            {group.name}
                          </span>
                        </div>
                        <div className="flex-1 h-8 bg-industrial-bg rounded-md border border-industrial-border relative">
                          {groupActions.map((action) => {
                            const startPercent = (action.startTime / playback.duration) * 100;
                            const widthPercent = (action.duration / playback.duration) * 100;
                            const isActive =
                              playback.currentTime >= action.startTime &&
                              playback.currentTime <= action.startTime + action.duration;

                            return (
                              <div
                                key={action.id}
                                className={cn(
                                  'absolute top-1 h-6 rounded transition-all',
                                  isActive && 'ring-2 ring-white/50'
                                )}
                                style={{
                                  left: `${startPercent}%`,
                                  width: `${widthPercent}%`,
                                  backgroundColor: group.color,
                                  opacity: isActive ? 1 : 0.6,
                                }}
                                title={`${action.effectId} - ${formatTime(action.startTime)}`}
                              />
                            );
                          })}
                          <div
                            className="absolute top-0 w-0.5 h-full bg-warning z-10"
                            style={{ left: `${(playback.currentTime / playback.duration) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
          <span>活跃喷头组: {activeGroupsNow} / {nozzleGroups.length}</span>
          <span>动作总数: {currentScript.actions.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePerformance}
            className="industrial-button flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            记录演出
          </button>
          <button
            onClick={() => navigate('/library')}
            className="industrial-button-primary flex items-center gap-2"
          >
            前往脚本库
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
