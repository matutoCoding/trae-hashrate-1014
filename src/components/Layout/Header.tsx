import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  Play,
  AlertTriangle,
  ChevronDown,
  Music,
  FileJson,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/algorithm/core';
import { cn } from '@/utils/helpers';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showImportMenu, setShowImportMenu] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLInputElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  const currentScript = useAppStore((state) => state.currentScript);
  const isSaving = useAppStore((state) => state.isSaving);
  const warnings = useAppStore((state) => state.warnings);
  const playback = useAppStore((state) => state.playback);
  const saveScript = useAppStore((state) => state.saveScript);
  const exportScript = useAppStore((state) => state.exportScript);
  const importAudioFile = useAppStore((state) => state.importAudioFile);
  const importScript = useAppStore((state) => state.importScript);
  const togglePlay = useAppStore((state) => state.togglePlay);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitles: Record<string, string> = {
    '/': '音轨解析',
    '/choreography': '水形编排',
    '/calibration': '时序校准',
    '/playback': '脚本回放',
    '/library': '脚本库',
  };

  const displayTitle = title || pageTitles[location.pathname] || '';
  const unresolvedWarnings = warnings.filter((w) => !w.resolved);
  const criticalWarnings = unresolvedWarnings.filter((w) => w.severity === 'critical');

  const handleSave = async () => {
    if (currentScript) {
      await saveScript();
    }
  };

  const handleExport = () => {
    if (currentScript) {
      exportScript(currentScript.id);
    }
  };

  const handleImportAudio = () => {
    setShowImportMenu(false);
    audioInputRef.current?.click();
  };

  const handleImportScript = () => {
    setShowImportMenu(false);
    scriptInputRef.current?.click();
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importAudioFile(file);
      } catch (error) {
        console.error('导入音频失败:', error);
      }
    }
    e.target.value = '';
  };

  const handleScriptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importScript(file);
      } catch (error) {
        console.error('导入脚本失败:', error);
      }
    }
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-industrial-panel border-b border-industrial-border px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-lg text-industrial-text glow-text">
          {displayTitle}
        </h2>
        {location.pathname !== '/library' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-industrial-bg border border-industrial-border">
            <span className="font-mono text-xs text-industrial-muted">TIME</span>
            <span className="font-mono text-sm text-accent">
              {formatTime(playback.currentTime)}
            </span>
            <span className="text-industrial-muted">/</span>
            <span className="font-mono text-sm text-industrial-muted">
              {formatTime(playback.duration)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {unresolvedWarnings.length > 0 && (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md border',
              criticalWarnings.length > 0
                ? 'bg-danger/10 border-danger/30 text-danger'
                : 'bg-warning/10 border-warning/30 text-warning'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono text-xs">
              {unresolvedWarnings.length} 个警告
              {criticalWarnings.length > 0 && ` (${criticalWarnings.length} 严重)`}
            </span>
          </div>
        )}

        <div className="h-6 w-px bg-industrial-border mx-2" />

        {location.pathname !== '/library' && (
          <>
            <button
              onClick={() => togglePlay()}
              className={cn(
                'industrial-button flex items-center gap-2',
                playback.isPlaying
                  ? 'border-accent text-accent'
                  : 'border-success/50 text-success hover:bg-success/10'
              )}
              disabled={!currentScript}
            >
              <Play className="w-4 h-4" />
              <span className="text-xs">{playback.isPlaying ? '暂停' : '预览'}</span>
            </button>

            <button className="industrial-button p-2" disabled>
              <Undo2 className="w-4 h-4" />
            </button>
            <button className="industrial-button p-2" disabled>
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-industrial-border mx-1" />
          </>
        )}

        <div className="relative" ref={importMenuRef}>
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className={cn(
              'industrial-button flex items-center gap-2',
              showImportMenu && 'border-accent text-accent'
            )}
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">导入</span>
            <ChevronDown className={cn('w-3 h-3 transition-transform', showImportMenu && 'rotate-180')} />
          </button>

          {showImportMenu && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-industrial-panel border border-industrial-border rounded-md shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleImportAudio}
                className="w-full px-3 py-2 text-left text-xs text-industrial-text hover:bg-industrial-bg flex items-center gap-2 transition-colors"
              >
                <Music className="w-4 h-4 text-accent" />
                导入音频
              </button>
              <button
                onClick={handleImportScript}
                className="w-full px-3 py-2 text-left text-xs text-industrial-text hover:bg-industrial-bg flex items-center gap-2 transition-colors border-t border-industrial-border"
              >
                <FileJson className="w-4 h-4 text-success" />
                导入脚本
              </button>
            </div>
          )}
        </div>

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioFileChange}
          className="hidden"
        />
        <input
          ref={scriptInputRef}
          type="file"
          accept=".json"
          onChange={handleScriptFileChange}
          className="hidden"
        />

        <button
          onClick={handleExport}
          className="industrial-button flex items-center gap-2"
          disabled={!currentScript}
        >
          <Download className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">导出</span>
        </button>

        <button
          onClick={handleSave}
          className="industrial-button-primary flex items-center gap-2"
          disabled={!currentScript || isSaving}
        >
          <Save className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">
            {isSaving ? '保存中...' : '保存'}
          </span>
        </button>
      </div>
    </header>
  );
};
