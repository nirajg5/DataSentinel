import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import {
  Menu,
  RefreshCw,
  LogOut,
  Shield,
  Layers,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UserRole } from '../../types/api';

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout, switchUserRole } = useAuth();
  const { backendReachable, latencyMs, isChecking, checkConnectivity, mode, setMode } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = (pathname: string): { title: string; category: string } => {
    switch (pathname) {
      case '/':
        return { title: 'Enterprise Observability Overview', category: 'Dashboard' };
      case '/datasets':
        return { title: 'Dataset Catalog & Schemas', category: 'Data Platform' };
      case '/ingestion':
        return { title: 'Dataset Ingestion Pipeline', category: 'Data Platform' };
      case '/etl':
        return { title: 'Silver & Gold ETL Operations', category: 'Data Platform' };
      case '/pipeline-runs':
        return { title: 'Pipeline Execution Runs', category: 'Data Platform' };
      case '/quality':
        return { title: 'Data Quality & Rule Checks', category: 'Reliability' };
      case '/freshness':
        return { title: 'Freshness SLA Monitoring', category: 'Reliability' };
      case '/reliability':
        return { title: 'Composite Reliability Index', category: 'Reliability' };
      case '/incidents':
        return { title: 'Incident Management & Triage', category: 'Reliability' };
      case '/predictions':
        return { title: 'Pipeline Failure Predictions', category: 'Observability' };
      case '/ai-analysis':
        return { title: 'AI Root Cause Analysis', category: 'Intelligence' };
      case '/rag':
        return { title: 'RAG Knowledge Assistant', category: 'Intelligence' };
      case '/agents':
        return { title: 'LangGraph Agent Investigations', category: 'Intelligence' };
      case '/agent-metrics':
        return { title: 'Agent Performance & Telemetry', category: 'Intelligence' };
      case '/health':
        return { title: 'System Health & Diagnostics', category: 'Operations' };
      case '/profile':
        return { title: 'User Profile & Permissions', category: 'Account' };
      case '/admin':
        return { title: 'Administration & Access Control', category: 'Operations' };
      default:
        return { title: 'DataSentinel Platform', category: 'Platform' };
    }
  };

  const pageInfo = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>{pageInfo.category}</span>
            <span>/</span>
            <span className="text-indigo-600">{pageInfo.title.split(' ')[0]}</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight hidden sm:block">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend Connectivity Status & Ping */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-700">Backend:</span>
          {backendReachable === null || isChecking ? (
            <Badge variant="neutral" size="sm" dot>
              Checking...
            </Badge>
          ) : backendReachable ? (
            <Badge variant="healthy" size="sm" dot>
              Live {latencyMs ? `(${latencyMs}ms)` : ''}
            </Badge>
          ) : (
            <Badge variant="degraded" size="sm" dot>
              Docker Offline (Mock Safe)
            </Badge>
          )}

          <button
            onClick={() => checkConnectivity()}
            disabled={isChecking}
            title="Recheck FastAPI Backend Connectivity"
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors ml-0.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
          <button
            onClick={() => setMode('adaptive')}
            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
              mode === 'adaptive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Auto-fall back to realistic mock fixtures if backend/Docker is down"
          >
            Adaptive
          </button>
          <button
            onClick={() => setMode('live_only')}
            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
              mode === 'live_only'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Strict live backend calls only (http://localhost:8000)"
          >
            Live Only
          </button>
        </div>

        {/* Role Quick Switcher for Testing */}
        <div className="hidden lg:flex items-center gap-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Role:</span>
          {(['admin', 'data_engineer', 'analyst'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchUserRole(r)}
              className={`px-2 py-1 rounded text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                user?.role === r
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* User Dropdown / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="View User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user?.username}</p>
              <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
