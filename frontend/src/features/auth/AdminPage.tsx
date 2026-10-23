import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../services/api/authApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Server,
  UserCheck,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, switchUserRole } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAccessCheck', user?.role],
    queryFn: () => authApi.checkAdminAccess(),
    retry: 0,
  });

  const adminResponse = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Restricted administrative controls and permission gate tests (GET /auth/admin-test)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Re-verify Access
        </Button>
      </div>

      {/* Admin Test Verification Result */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <CardTitle>Administrative Gate Verification (GET /auth/admin-test)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Verifying administrative role claims with backend...
            </div>
          ) : error || !isAdmin ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>403 Forbidden: Administrative Access Denied</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                Your current session role is <strong>{user?.role?.toUpperCase()}</strong>. Endpoint{' '}
                <code>/auth/admin-test</code> requires the <code>admin</code> role claim in your JWT.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => switchUserRole('admin')}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  Switch Role to Admin
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Administrative Clearance Verified</span>
                </div>
                <Badge variant="healthy" size="sm">
                  STATUS: {adminResponse?.status.toUpperCase() || 'SUCCESS'}
                </Badge>
              </div>

              <p className="text-emerald-800 text-xs leading-relaxed">
                {adminResponse?.message ||
                  'Admin access verified. You possess full platform privileges for maintenance and task recovery.'}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-emerald-900 border-t border-emerald-200/80">
                <div>
                  <span className="text-emerald-700 uppercase font-semibold text-[10px]">Verified Role</span>
                  <p className="font-bold">{adminResponse?.user_role || 'admin'}</p>
                </div>
                <div>
                  <span className="text-emerald-700 uppercase font-semibold text-[10px]">Audit Timestamp</span>
                  <p className="font-mono">
                    {adminResponse?.timestamp ? new Date(adminResponse.timestamp).toLocaleString() : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-700" />
              <CardTitle>Worker Maintenance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Celery workers and LangGraph agents maintain state in Redis. Stale tasks may be purged using the
              dedicated maintenance endpoint:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-indigo-700">
              POST /agent/maintenance/recover-stale
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" />
              <CardTitle>Environment Architecture</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">API Gateway:</span>
                <span className="font-mono font-semibold text-slate-800">FastAPI (Python 3.11)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database Engine:</span>
                <span className="font-mono font-semibold text-slate-800">PostgreSQL (SQLAlchemy)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Queue Broker:</span>
                <span className="font-mono font-semibold text-slate-800">Redis &amp; Celery</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Vector Knowledge Store:</span>
                <span className="font-mono font-semibold text-slate-800">Pinecone Vector DB</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Telemetry Engine:</span>
                <span className="font-mono font-semibold text-slate-800">Prometheus / OpenTelemetry</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
