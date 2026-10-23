import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { useConfig } from '../../context/ConfigContext';
import { AlertTriangle, ServerOff, CheckCircle2, RefreshCw } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { backendReachable, isChecking, checkConnectivity, mode } = useConfig();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        {/* Top Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Informational Offline/Fallback Banner (if backend is offline) */}
        {backendReachable === false && mode === 'adaptive' && (
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Backend Offline (FastAPI at http://localhost:8000 not reachable):</strong>{' '}
                Operating in adaptive mock fixture mode. All 34 API contracts, schemas, and flows remain fully interactive.
              </span>
            </div>
            <button
              onClick={() => checkConnectivity()}
              disabled={isChecking}
              className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              Retry Live
            </button>
          </div>
        )}

        {/* Live Connected Banner */}
        {backendReachable === true && (
          <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Live FastAPI Backend Connected:</strong> All requests dispatch directly to localhost:8000.
              </span>
            </div>
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Toast Alerts */}
        <ToastContainer />
      </div>
    </div>
  );
};
