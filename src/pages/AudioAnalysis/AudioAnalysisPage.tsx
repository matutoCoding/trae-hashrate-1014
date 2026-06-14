import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music2,
  Waves,
  Activity,
  Grid3X3,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { WaveformDisplay } from '@/components/Waveform/WaveformDisplay';
import { FileUpload, FileInfo } from '@/components/common/FileUpload';
import { PlaybackControls } from '@/components/common/PlaybackControls';
import { DigitalDisplay, StatusIndicator } from '@/components/Dashboard/Gauges';
import { useAppStore } from '@/store/useAppStore';
import { getSectionTypeName, getSectionTypeColor } from '@/algorithm/audioAnalysis';
import { formatTime } from '@/utils/helpers';
import { TrackInfo } from '@/types';

export const AudioAnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  const analysisResult = useAppStore((state) => state.analysisResult);
  const isAnalyzing = useAppStore((state) => state.isAnalyzing);
  const playback = useAppStore((state) => state.playback);
  const setCurrentTrack = useAppStore((state) => state.setCurrentTrack);
  const setAnalysisResult = useAppStore((state) => state.setAnalysisResult);
  const setPlayback = useAppStore((state) => state.setPlayback);
  const updatePlaybackTime = useAppStore((state) => state.updatePlaybackTime);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const importAudioFile = useAppStore((state) => state.importAudioFile);
  const currentTrack = useAppStore((state) => state.currentTrack);
  const createNewScript = useAppStore((state) => state.createNewScript);
  const categories = useAppStore((state) => state.categories);
  const currentScript = useAppStore((state) => state.currentScript);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptCategory, setScriptCategory] = useState('pop');

  const handleFileSelect = async (file: File) => {
    try {
      await importAudioFile(file);
    } catch (error) {
      console.error('Failed to import audio:', error);
      alert('音频分析失败，请检查文件格式');
    }
  };

  const handleRemoveTrack = () => {
    setCurrentTrack(null);
    setAnalysisResult(null);
    setPlayback({ duration: 0, currentTime: 0, isPlaying: false, speed: 1, loop: false, volume: 0.8 });
  };

  const handleCreateScript = async () => {
    if (!analysisResult) return;

    const name = scriptName || `${currentTrack?.name || '未命名'} - 水形编排`;
    await createNewScript(name, scriptCategory);
    setShowCreateModal(false);
    navigate('/choreography');
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="industrial-panel p-4">
          <StatusIndicator
            status={analysisResult ? 'active' : 'idle'}
            label="分析状态"
            value={analysisResult ? '已完成' : '待分析'}
          />
        </div>
        <DigitalDisplay
          value={analysisResult?.bpm || '--'}
          label="BPM 节拍"
          color="#00F0FF"
          size="md"
        />
        <DigitalDisplay
          value={analysisResult ? analysisResult.beatTimes.length : '--'}
          label="节拍点数"
          color="#00D26A"
          size="md"
        />
        <DigitalDisplay
          value={analysisResult ? analysisResult.sections.length : '--'}
          label="段落数"
          color="#FF6B35"
          size="md"
        />
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {!currentTrack ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl">
              <FileUpload onFileSelect={handleFileSelect} />
              <div className="mt-6 text-center">
                <p className="text-sm text-industrial-muted">
                  支持 MP3、WAV、FLAC、AAC、OGG 格式的音频文件
                </p>
                <p className="text-xs text-industrial-muted mt-2">
                  系统将自动检测节拍、分析频段能量并划分音乐段落
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0">
              <FileInfo
                name={currentTrack.name}
                size={currentTrack.fileSize}
                format={currentTrack.format}
                duration={analysisResult?.duration}
                onRemove={handleRemoveTrack}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {analysisResult && (
              <>
                <div className="industrial-panel p-4 flex-1 overflow-hidden flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-industrial-text flex items-center gap-2">
                      <Waves className="w-5 h-5 text-accent" />
                      波形与节拍分析
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-industrial-muted">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-1 rounded bg-accent" /> 重拍
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-1 rounded bg-industrial-muted/50" /> 弱拍
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <WaveformDisplay
                      analysisResult={analysisResult}
                      currentTime={playback.currentTime}
                      onSeek={updatePlaybackTime}
                      height={280}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="industrial-panel p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-warning" />
                        <span className="industrial-label">低频能量 (20-250Hz)</span>
                      </div>
                      <div className="h-24 bg-industrial-bg rounded-md border border-industrial-border overflow-hidden">
                        <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
                          <path
                            d={generateEnergyPath(analysisResult.frequencyBands.low, 80)}
                            fill="rgba(255, 107, 53, 0.3)"
                            stroke="#FF6B35"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="industrial-panel p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-accent" />
                        <span className="industrial-label">中频能量 (250-2000Hz)</span>
                      </div>
                      <div className="h-24 bg-industrial-bg rounded-md border border-industrial-border overflow-hidden">
                        <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
                          <path
                            d={generateEnergyPath(analysisResult.frequencyBands.mid, 80)}
                            fill="rgba(0, 240, 255, 0.3)"
                            stroke="#00F0FF"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="industrial-panel p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-success" />
                        <span className="industrial-label">高频能量 (2-20kHz)</span>
                      </div>
                      <div className="h-24 bg-industrial-bg rounded-md border border-industrial-border overflow-hidden">
                        <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
                          <path
                            d={generateEnergyPath(analysisResult.frequencyBands.high, 80)}
                            fill="rgba(0, 210, 106, 0.3)"
                            stroke="#00D26A"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="industrial-panel p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Grid3X3 className="w-4 h-4 text-accent" />
                      <span className="industrial-label">段落划分</span>
                    </div>
                    <div className="flex gap-1 h-16">
                      {analysisResult.sections.map((section, index) => (
                        <div
                          key={section.id}
                          className="flex-1 rounded-md flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border border-transparent hover:border-accent/30"
                          style={{
                            backgroundColor: `${getSectionTypeColor(section.type)}20`,
                            borderColor: `${getSectionTypeColor(section.type)}40`,
                          }}
                          onClick={() => updatePlaybackTime(section.startTime)}
                        >
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: getSectionTypeColor(section.type) }}
                          >
                            {getSectionTypeName(section.type)}
                          </span>
                          <span className="text-[10px] text-industrial-muted mt-1">
                            {formatTime(section.startTime)} - {formatTime(section.endTime)}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 h-2 rounded-full"
                                style={{
                                  backgroundColor: i < Math.round(section.intensity * 5)
                                    ? getSectionTypeColor(section.type)
                                    : '#2A3F5F',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-industrial-muted">
                    <Info className="w-4 h-4" />
                    <span>节拍检测完成，共检测到 {analysisResult.beatTimes.length} 个节拍点</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {currentScript ? (
                      <button
                        onClick={() => navigate('/choreography')}
                        className="industrial-button-primary flex items-center gap-2"
                      >
                        继续编排
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setScriptName(`${currentTrack.name} - 水形编排`);
                          setShowCreateModal(true);
                        }}
                        className="industrial-button-success flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        创建编排脚本
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {analysisResult && (
        <div className="flex-shrink-0">
          <PlaybackControls
            playback={playback}
            onPlayPause={togglePlay}
            onSeek={updatePlaybackTime}
            onReset={resetPlayback}
            onSpeedChange={(speed) => setPlayback({ speed })}
            onVolumeChange={(volume) => setPlayback({ volume })}
            onToggleLoop={() => setPlayback({ loop: !playback.loop })}
            disabled={!analysisResult}
          />
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="industrial-panel p-6 w-full max-w-md">
            <h3 className="font-display text-lg text-industrial-text mb-4 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-accent" />
              创建编排脚本
            </h3>

            <div className="space-y-4">
              <div>
                <label className="industrial-label block mb-2">脚本名称</label>
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  className="industrial-input"
                  placeholder="输入脚本名称"
                />
              </div>

              <div>
                <label className="industrial-label block mb-2">曲目分类</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setScriptCategory(cat.id)}
                      className={`p-2 rounded-md border text-xs font-mono transition-all ${
                        scriptCategory === cat.id
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-industrial-border text-industrial-muted hover:border-accent/50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-industrial-bg border border-industrial-border">
                <p className="text-xs text-industrial-muted">
                  将基于分析结果创建编排脚本，包含 {analysisResult.beatTimes.length} 个节拍点
                  和 {analysisResult.sections.length} 个音乐段落
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="industrial-button"
              >
                取消
              </button>
              <button
                onClick={handleCreateScript}
                className="industrial-button-primary flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                创建并开始编排
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function generateEnergyPath(data: number[], height: number): string {
  if (!data || data.length === 0) return '';

  const width = 400;
  const step = width / data.length;
  let path = `M 0 ${height}`;

  data.forEach((value, index) => {
    const x = index * step;
    const y = height - value * height * 0.9;
    path += ` L ${x} ${y}`;
  });

  path += ` L ${width} ${height} Z`;
  return path;
}
