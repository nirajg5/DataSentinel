import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useConfig } from '../../context/ConfigContext';
import {
  User,
  Shield,
  Key,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { UserRole } from '../../types/api';

export const ProfilePage: React.FC = () => {
  const { user, token, switchUserRole } = useAuth();
  const { addToast } = useConfig();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'info',
        title: 'Token Copied',
        message: 'JWT Bearer token copied to clipboard.',
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="critical">ADMINISTRATOR</Badge>;
      case 'data_engineer':
        return <Badge variant="info">DATA ENGINEER</Badge>;
      case 'analyst':
        return <Badge variant="healthy">ANALYST</Badge>;
      default:
        return <Badge variant="neutral">VIEWER</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Profile &amp; Role Permissions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Authenticated identity and platform authorization details retrieved from GET /auth/me
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="lg:col-span-1">
          <CardContent className="text-center pt-8 pb-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{user?.full_name || user?.username}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            </div>

            <div className="pt-2">{user?.role && getRoleBadge(user.role)}</div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2 mt-4">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-slate-800 font-semibold">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-600">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles & Permissions Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
              </div>
              <p className="text-xs text-slate-500">FastAPI backend security policies</p>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                DataSentinel enforces endpoint authorization via JWT claim verification in <code>backend/auth/dependencies.py</code>.
                You can switch between predefined testing roles below to verify permission gates:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => switchUserRole('admin')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    user?.role === 'admin'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-slate-900">Administrator</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Full access including /auth/admin-test and /agent/maintenance/recover-stale
                  </p>
                </button>

                <button
                  onClick={() => switchUserRole('data_engineer')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    user?.role === 'data_engineer'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-slate-900">Data Engineer</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Triggers ETL, quality suites, ingestion pipelines, and ML failure prediction
                  </p>
                </button>

                <button
                  onClick={() => switchUserRole('analyst')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    user?.role === 'analyst'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-slate-900">Analyst</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Queries RAG knowledge assistant, inspects incident dashboards, and views SLA reports
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Token Inspector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-600" />
                <CardTitle>Session JWT Bearer Token</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToken}
                leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy Token'}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-slate-950 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto break-all">
                {token || 'No active token'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
