import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  Search,
  Filter,
  Play,
  Edit,
  Trash2,
  Download,
  Plus,
  Music2,
  Calendar,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  History,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ShowScript } from '@/types';
import { formatTime, formatDate, formatDateShort, cn } from '@/utils/helpers';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<string | null>(null);

  const scripts = useAppStore((state) => state.scripts);
  const categories = useAppStore((state) => state.categories);
  const scriptFilter = useAppStore((state) => state.scriptFilter);
  const setScriptFilter = useAppStore((state) => state.setScriptFilter);
  const loadScript = useAppStore((state) => state.loadScript);
  const deleteScript = useAppStore((state) => state.deleteScript);
  const exportScript = useAppStore((state) => state.exportScript);

  const selectedScript = scripts.find((s) => s.id === selectedScriptId);

  const filteredScripts = useMemo(() => {
    let result = [...scripts];

    if (scriptFilter.category) {
      result = result.filter((s) => s.category === scriptFilter.category);
    }

    if (scriptFilter.search) {
      const search = scriptFilter.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.trackName.toLowerCase().includes(search) ||
          s.artist.toLowerCase().includes(search) ||
          s.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    if (scriptFilter.tags && scriptFilter.tags.length > 0) {
      result = result.filter((s) =>
        scriptFilter.tags?.some((t) => s.tags.includes(t))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (scriptFilter.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
      }
      return scriptFilter.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [scripts, scriptFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    scripts.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [scripts]);

  const getCategoryInfo = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  };

  const handleLoadScript = (script: ShowScript) => {
    loadScript(script.id);
    navigate('/choreography');
  };

  const handlePlayScript = (script: ShowScript) => {
    loadScript(script.id);
    navigate('/playback');
  };

  const handleExportScript = (script: ShowScript) => {
    exportScript(script.id, '');
  };

  const handleDeleteScript = (script: ShowScript) => {
    if (confirm(`确定要删除脚本 "${script.name}" 吗？`)) {
      deleteScript(script.id);
      if (selectedScriptId === script.id) {
        setSelectedScriptId(null);
      }
    }
  };

  const ScriptCard: React.FC<{ script: ShowScript }> = ({ script }) => {
    const category = getCategoryInfo(script.category);
    const isSelected = selectedScriptId === script.id;
    const lastPerformance = script.performanceRecords[script.performanceRecords.length - 1];

    return (
      <div
        className={cn(
          'industrial-panel p-4 cursor-pointer transition-all hover:border-accent/50',
          isSelected && 'border-accent ring-2 ring-accent/20'
        )}
        onClick={() => setSelectedScriptId(isSelected ? null : script.id)}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Music2 className="w-6 h-6" style={{ color: category.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-mono text-sm text-industrial-text truncate">
              {script.name}
            </h4>
            <p className="text-xs text-industrial-muted truncate mt-0.5">
              {script.trackName} - {script.artist}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono"
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
              >
                {category.name}
              </span>
              <span className="text-[10px] text-industrial-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(script.duration)}
              </span>
              <span className="text-[10px] text-industrial-muted flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {script.actions.length} 动作
              </span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="mt-4 pt-4 border-t border-industrial-border space-y-3">
            <div className="flex items-center gap-2">
              {script.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-industrial-bg text-[10px] text-industrial-muted flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-2 rounded bg-industrial-bg">
                <p className="text-industrial-muted">创建时间</p>
                <p className="text-industrial-text font-mono mt-1">
                  {formatDateShort(script.createdAt)}
                </p>
              </div>
              <div className="p-2 rounded bg-industrial-bg">
                <p className="text-industrial-muted">版本</p>
                <p className="text-accent font-mono mt-1">v{script.version}</p>
              </div>
              <div className="p-2 rounded bg-industrial-bg">
                <p className="text-industrial-muted">演出次数</p>
                <p className="text-success font-mono mt-1">{script.performanceRecords.length}</p>
              </div>
            </div>

            {lastPerformance && (
              <div className="p-2 rounded bg-industrial-bg">
                <p className="text-[10px] text-industrial-muted mb-1">最近演出</p>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'status-indicator',
                      lastPerformance.status === 'success' && 'status-active',
                      lastPerformance.status === 'partial' && 'status-warning',
                      lastPerformance.status === 'failed' && 'status-error'
                    )}
                  />
                  <span className="text-xs text-industrial-text">
                    {formatDate(lastPerformance.timestamp)}
                  </span>
                  <span className="text-[10px] text-industrial-muted">
                    {lastPerformance.venue}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayScript(script);
                }}
                className="industrial-button-primary flex-1 flex items-center justify-center gap-2 text-xs py-2"
              >
                <Play className="w-3.5 h-3.5" />
                回放
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadScript(script);
                }}
                className="industrial-button flex items-center justify-center gap-2 text-xs py-2 px-4"
              >
                <Edit className="w-3.5 h-3.5" />
                编辑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportScript(script);
                }}
                className="industrial-button flex items-center justify-center gap-2 text-xs py-2 px-4"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteScript(script);
                }}
                className="industrial-button flex items-center justify-center gap-2 text-xs py-2 px-4 text-danger hover:bg-danger/10 hover:border-danger/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/30">
            <Library className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display text-lg text-industrial-text">脚本库</h2>
            <p className="text-xs text-industrial-muted">共 {scripts.length} 个编排脚本</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-industrial-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索脚本..."
              value={scriptFilter.search || ''}
              onChange={(e) => setScriptFilter({ search: e.target.value })}
              className="industrial-input pl-9 w-64 text-xs h-9"
            />
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="industrial-button-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建脚本
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-4">
        <div className="w-56 flex-shrink-0 space-y-4 overflow-auto">
          <div className="industrial-panel p-4">
            <h3 className="industrial-label mb-3 flex items-center gap-2">
              <Filter className="w-3 h-3" />
              分类筛选
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setScriptFilter({ category: undefined })}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-all flex items-center gap-2',
                  !scriptFilter.category
                    ? 'bg-accent/10 text-accent'
                    : 'text-industrial-muted hover:bg-industrial-border/50 hover:text-industrial-text'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-industrial-muted" />
                全部
                <span className="ml-auto text-industrial-muted">{scripts.length}</span>
              </button>
              {categories.map((category) => {
                const count = scripts.filter((s) => s.category === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setScriptFilter({ category: category.id })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-all flex items-center gap-2',
                      scriptFilter.category === category.id
                        ? 'bg-accent/10 text-accent'
                        : 'text-industrial-muted hover:bg-industrial-border/50 hover:text-industrial-text'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                    <span className="ml-auto text-industrial-muted">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="industrial-panel p-4">
            <h3 className="industrial-label mb-3 flex items-center gap-2">
              <Tag className="w-3 h-3" />
              标签筛选
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 10).map((tag) => {
                const isSelected = scriptFilter.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      const currentTags = scriptFilter.tags || [];
                      const newTags = isSelected
                        ? currentTags.filter((t) => t !== tag)
                        : [...currentTags, tag];
                      setScriptFilter({ tags: newTags.length > 0 ? newTags : undefined });
                    }}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-mono transition-all',
                      isSelected
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'bg-industrial-bg text-industrial-muted border border-industrial-border hover:border-accent/30'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="industrial-panel p-4">
            <h3 className="industrial-label mb-3 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              排序
            </h3>
            <div className="space-y-2">
              <select
                value={scriptFilter.sortBy}
                onChange={(e) =>
                  setScriptFilter({ sortBy: e.target.value as any })
                }
                className="industrial-input text-xs h-8"
              >
                <option value="updatedAt">最近更新</option>
                <option value="createdAt">创建时间</option>
                <option value="name">名称</option>
                <option value="duration">时长</option>
              </select>
              <button
                onClick={() =>
                  setScriptFilter({
                    sortOrder: scriptFilter.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                className="w-full industrial-button flex items-center justify-center gap-2 text-xs py-1.5"
              >
                {scriptFilter.sortOrder === 'desc' ? (
                  <><ChevronDown className="w-3 h-3" /> 降序</>
                ) : (
                  <><ChevronUp className="w-3 h-3" /> 升序</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="text-xs text-industrial-muted">
              显示 {filteredScripts.length} 个结果
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredScripts.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Library className="w-16 h-16 text-industrial-muted mx-auto mb-4 opacity-50" />
                  <p className="text-industrial-text font-mono">没有找到匹配的脚本</p>
                  <p className="text-xs text-industrial-muted mt-1">
                    尝试调整筛选条件或创建新脚本
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredScripts.map((script) => (
                  <ScriptCard key={script.id} script={script} />
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedScript && (
          <div className="w-80 flex-shrink-0 border-l border-industrial-border bg-industrial-panel flex flex-col overflow-hidden">
            <div className="p-4 border-b border-industrial-border">
              <h3 className="industrial-label mb-2">脚本详情</h3>
              <h4 className="font-display text-lg text-industrial-text">{selectedScript.name}</h4>
              <p className="text-xs text-industrial-muted mt-1">
                {selectedScript.trackName} - {selectedScript.artist}
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-industrial-bg text-center">
                  <p className="text-[10px] text-industrial-muted">动作数</p>
                  <p className="font-display text-xl text-accent mt-1">
                    {selectedScript.actions.length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-industrial-bg text-center">
                  <p className="text-[10px] text-industrial-muted">时长</p>
                  <p className="font-display text-xl text-success mt-1">
                    {formatTime(selectedScript.duration)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-industrial-bg text-center">
                  <p className="text-[10px] text-industrial-muted">喷头组</p>
                  <p className="font-display text-xl text-warning mt-1">
                    {selectedScript.nozzleGroups.length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-industrial-bg text-center">
                  <p className="text-[10px] text-industrial-muted">版本</p>
                  <p className="font-display text-xl text-industrial-text mt-1">
                    v{selectedScript.version}
                  </p>
                </div>
              </div>

              {selectedScript.description && (
                <div className="p-3 rounded-lg bg-industrial-bg">
                  <p className="text-[10px] text-industrial-muted mb-2">描述</p>
                  <p className="text-xs text-industrial-text">{selectedScript.description}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-industrial-bg">
                <p className="text-[10px] text-industrial-muted mb-2">时间信息</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-industrial-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 创建
                    </span>
                    <span className="text-industrial-text">{formatDate(selectedScript.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-industrial-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 更新
                    </span>
                    <span className="text-industrial-text">{formatDate(selectedScript.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div
                  className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-industrial-bg"
                  onClick={() =>
                    setExpandedRecords(
                      expandedRecords === 'performances' ? null : 'performances'
                    )
                  }
                >
                  <h4 className="industrial-label mb-0 flex items-center gap-2">
                    <History className="w-3 h-3" />
                    演出记录 ({selectedScript.performanceRecords.length})
                  </h4>
                  {expandedRecords === 'performances' ? (
                    <ChevronUp className="w-3 h-3 text-industrial-muted" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-industrial-muted" />
                  )}
                </div>

                {expandedRecords === 'performances' && (
                  <div className="mt-2 space-y-2">
                    {selectedScript.performanceRecords.length === 0 ? (
                      <p className="text-xs text-industrial-muted text-center py-4">
                        暂无演出记录
                      </p>
                    ) : (
                      selectedScript.performanceRecords
                        .slice()
                        .reverse()
                        .slice(0, 5)
                        .map((record) => (
                          <div
                            key={record.id}
                            className="p-2 rounded bg-industrial-bg border border-industrial-border"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={cn(
                                  'status-indicator',
                                  record.status === 'success' && 'status-active',
                                  record.status === 'partial' && 'status-warning',
                                  record.status === 'failed' && 'status-error'
                                )}
                              />
                              <span className="text-xs text-industrial-text font-mono">
                                {record.status === 'success' && '成功'}
                                {record.status === 'partial' && '部分成功'}
                                {record.status === 'failed' && '失败'}
                              </span>
                            </div>
                            <div className="space-y-1 text-[10px] text-industrial-muted">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {formatDate(record.timestamp)}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5" />
                                {record.operator}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {record.venue}
                              </div>
                              {record.anomalies.length > 0 && (
                                <div className="flex items-center gap-1 text-warning">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  {record.anomalies.length} 个异常
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-industrial-border space-y-2">
              <button
                onClick={() => handlePlayScript(selectedScript)}
                className="w-full industrial-button-primary flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                播放脚本
              </button>
              <button
                onClick={() => handleLoadScript(selectedScript)}
                className="w-full industrial-button flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                编辑脚本
              </button>
            </div>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="industrial-panel p-6 w-full max-w-md">
            <h3 className="font-display text-lg text-industrial-text mb-4">新建脚本</h3>
            <p className="text-sm text-industrial-muted mb-4">
              请先导入音乐文件，系统将自动分析节拍并创建编排脚本。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="industrial-button"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  navigate('/');
                }}
                className="industrial-button-primary flex items-center gap-2"
              >
                <Music2 className="w-4 h-4" />
                前往导入音乐
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
