import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import {
  LayoutDashboard,
  Database,
  UploadCloud,
  Workflow,
  PlaySquare,
  ShieldCheck,
  Clock,
  Activity,
  AlertOctagon,
  TrendingDown,
  BrainCircuit,
  HelpCircle,
  Bot,
  BarChart3,
  HeartPulse,
  User,
  Lock,
  ChevronRight,
  Shield,
  Layers,
  Radio,
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  badge?: string | number;
  adminOnly?: boolean;
}

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, isAdmin } = useAuth();
  const { backendReachable, mode } = useConfig();

  const primaryNavItems: NavItem[] = [
    { name: 'Overview', to: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Datasets', to: '/datasets', icon: <Database className="w-4 h-4" /> },
    { name: 'Ingestion', to: '/ingestion', icon: <UploadCloud className="w-4 h-4" /> },
    { name: 'ETL Operations', to: '/etl', icon: <Workflow className="w-4 h-4" /> },
    { name: 'Pipeline Runs', to: '/pipeline-runs', icon: <PlaySquare className="w-4 h-4" /> },
  ];

  const reliabilityNavItems: NavItem[] = [
    { name: 'Data Quality', to: '/quality', icon: <ShieldCheck className="w-4 h-4" /> },
    { name: 'Freshness', to: '/freshness', icon: <Clock className="w-4 h-4" /> },
    { name: 'Reliability Index', to: '/reliability', icon: <Activity className="w-4 h-4" /> },
    { name: 'Incidents', to: '/incidents', icon: <AlertOctagon className="w-4 h-4 text-rose-400" />, badge: 2 },
    { name: 'Failure Predictions', to: '/predictions', icon: <TrendingDown className="w-4 h-4" /> },
  ];

  const intelligenceNavItems: NavItem[] = [
    { name: 'AI Analysis', to: '/ai-analysis', icon: <BrainCircuit className="w-4 h-4" /> },
    { name: 'RAG Assistant', to: '/rag', icon: <HelpCircle className="w-4 h-4" /> },
    { name: 'Agent Investigations', to: '/agents', icon: <Bot className="w-4 h-4 text-indigo-400" /> },
    { name: 'Agent Metrics', to: '/agent-metrics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const systemNavItems: NavItem[] = [
    { name: 'System Health', to: '/health', icon: <HeartPulse className="w-4 h-4" /> },
    { name: 'User Profile', to: '/profile', icon: <User className="w-4 h-4" /> },
    { name: 'Administration', to: '/admin', icon: <Lock className="w-4 h-4 text-amber-400" />, adminOnly: true },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      <div className="px-3 mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{title}</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-r-2 border-indigo-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="transition-transform group-hover:scale-105 shrink-0">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0B132B] text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Shield className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">DataSentinel</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Reliability & Observability</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-slate-800">
          {renderNavGroup('Data Platform', primaryNavItems)}
          {renderNavGroup('Observability & SLA', reliabilityNavItems)}
          {renderNavGroup('Agentic AI & RAG', intelligenceNavItems)}
          {renderNavGroup('Operations', systemNavItems)}
        </div>

        {/* Environment Status Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-xs shrink-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Radio
                className={`w-3.5 h-3.5 ${
                  backendReachable ? 'text-emerald-400 animate-pulse' : 'text-purple-400'
                }`}
              />
              <span className="text-[11px] font-medium">
                {backendReachable ? 'Live API (8000)' : 'Mock Fixtures'}
              </span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold font-mono ${
                mode === 'live_only'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-purple-950 text-purple-300 border border-purple-800'
              }`}
            >
              {mode === 'live_only' ? 'LIVE' : 'ADAPTIVE'}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.username?.[0] || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.username || 'Guest'}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">
                  {user?.role?.replace('_', ' ') || 'Viewer'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};
