import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Music2,
  Layers,
  Clock,
  Play,
  Library,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAppStore } from '@/store/useAppStore';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navItems = [
  { path: '/', label: '音轨解析', icon: Music2 },
  { path: '/choreography', label: '水形编排', icon: Layers },
  { path: '/calibration', label: '时序校准', icon: Clock },
  { path: '/playback', label: '脚本回放', icon: Play },
  { path: '/library', label: '脚本库', icon: Library },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const warnings = useAppStore((state) => state.warnings);
  const currentScript = useAppStore((state) => state.currentScript);
  const isCalibrated = useAppStore((state) => state.isCalibrated);

  const criticalWarnings = warnings.filter((w) => w.severity === 'critical' && !w.resolved);
  const warningCount = warnings.filter((w) => !w.resolved).length;

  return (
    <div
      className={cn(
        'h-full bg-industrial-panel border-r border-industrial-border flex flex-col',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="p-4 border-b border-industrial-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/30">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display text-sm text-accent glow-text">FOUNTAIN</h1>
              <p className="text-[10px] text-industrial-muted">STUDIO v1.0</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isChoreography = item.path === '/choreography';
          const isCalibration = item.path === '/calibration';

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-md transition-all duration-200 group relative',
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/30 shadow-glow'
                    : 'text-industrial-muted hover:text-industrial-text hover:bg-industrial-border/50 border border-transparent'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-mono text-sm">{item.label}</span>}

              {isChoreography && currentScript && !isCalibrated && !collapsed && (
                <div className="ml-auto w-2 h-2 rounded-full bg-warning animate-pulse" />
              )}

              {isCalibration && warningCount > 0 && !collapsed && (
                <div className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-danger/20 text-danger text-[10px] font-bold flex items-center justify-center">
                  {warningCount}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && currentScript && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-industrial-bg border border-industrial-border">
          <p className="text-[10px] text-industrial-muted uppercase tracking-wider mb-1">当前脚本</p>
          <p className="text-sm text-industrial-text font-mono truncate">{currentScript.name}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn('status-indicator', currentScript.actions.length > 0 ? 'status-active' : 'status-idle')} />
            <span className="text-xs text-industrial-muted">
              {currentScript.actions.length} 个动作
            </span>
          </div>
          {criticalWarnings.length > 0 && (
            <div className="mt-2 p-2 rounded bg-danger/10 border border-danger/30">
              <p className="text-[10px] text-danger">
                {criticalWarnings.length} 个严重警告
              </p>
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t border-industrial-border">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-industrial-muted hover:text-industrial-text hover:bg-industrial-border/50 transition-colors">
          <Settings className="w-4 h-4" />
          {!collapsed && <span className="font-mono text-sm">系统设置</span>}
        </button>
      </div>
    </div>
  );
};
