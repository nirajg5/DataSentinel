import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../services/api/healthApi';
import { metricsApi } from '../../services/api/metricsApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  HeartPulse,
  Database,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const HealthPage: React.FC = () => {
  const { addToast, backendReachable, latencyMs } = useConfig();
  const [activeTab, setActiveTab] = useState<'health' | 'metrics'>('health');
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: rootData, refetch: refetchRoot } = useQuery({
    queryKey: ['systemRoot'],
    queryFn: () => healthApi.getRoot(),
  });

  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: () => healthApi.getHealth(),
  });

  const { data: dbData, refetch: refetchDb } = useQuery({
    queryKey: ['dbHealthDetail'],
    queryFn: () => healthApi.getDatabaseHealth(),
  });

  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['prometheusMetrics'],
    queryFn: () => metricsApi.getMetricsRaw(),
  });

  const root = rootData?.data;
  const health = healthData?.data;
  const dbHealth = dbData?.data;
  const metrics = metricsData;

  const handleCopyRaw = () => {
    if (metrics?.raw) {
      navigator.clipboard.writeText(metrics.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: 'Prometheus raw exposition text copied.',
      });
    }
  };

  const handleRefreshAll = () => {
    refetchRoot();
    refetchHealth();
    refetchDb();
    refetchMetrics();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Health &amp; Diagnostics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status probes for FastAPI core, PostgreSQL connection pools, and Prometheus scrapers
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Ping All Services
        </Button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'health' | 'metrics')}
        tabs={[
          {
            id: 'health',
            label: 'Service & Database Health',
            icon: <HeartPulse className="w-4 h-4" />,
          },
          {
            id: 'metrics',
            label: 'Prometheus Scraper Metrics (GET /metrics)',
            icon: <Activity className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'health' ? (
        <div className="space-y-6">
          {/* Main Service Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Core Application Identity (GET /) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <CardTitle>Core Identity (GET /)</CardTitle>
                </div>
                <Badge variant="healthy" size="sm" dot>
                  {root?.status.toUpperCase() || 'ONLINE'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Service Name</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{root?.app_name || 'DataSentinel API'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">API Version</span>
                  <p className="font-mono text-slate-800 mt-0.5">{root?.version || 'v2.4.0'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">OpenAPI Docs</span>
                  <a
                    href={root?.docs_url || 'http://localhost:8000/docs'}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-600 hover:underline block mt-0.5 truncate"
                  >
                    {root?.docs_url || 'http://localhost:8000/docs'}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* FastAPI Service Health (GET /health) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <CardTitle>API Runtime (GET /health)</CardTitle>
                </div>
                <Badge variant={health?.status === 'healthy' ? 'healthy' : 'degraded'} size="sm" dot>
                  {health?.status.toUpperCase() || 'HEALTHY'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Process Uptime</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {health?.uptime_sec ? `${Math.floor(health.uptime_sec / 3600)}h ${Math.floor((health.uptime_sec % 3600) / 60)}m` : '117h 12m'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Network Latency</span>
                  <p className="font-mono text-slate-800 mt-0.5">{latencyMs ? `${latencyMs} ms` : '3 ms'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Probe Timestamp</span>
                  <p className="text-slate-500 mt-0.5">
                    {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Just now'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Database Health (GET /health/database) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <CardTitle>Database (GET /health/database)</CardTitle>
                </div>
                <Badge
                  variant={dbHealth?.status === 'connected' ? 'healthy' : 'failing'}
                  size="sm"
                  dot
                >
                  {dbHealth?.status.toUpperCase() || 'STANDBY'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {dbHealth?.status === 'connected' ? (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Postgres Roundtrip</span>
                      <p className="font-bold text-emerald-600 mt-0.5">{dbHealth.latency_ms} ms</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Connection Pool Size</span>
                      <p className="font-mono text-slate-800 mt-0.5">
                        {dbHealth.active_connections || 4} active / {dbHealth.pool_size || 20} max
                      </p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                      PostgreSQL engine healthy &amp; responsive.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        503: Database Unreachable
                      </div>
                      <p className="text-[10px] leading-relaxed">
                        The FastAPI API server is running, but cannot establish a connection to PostgreSQL (port 5432).
                        Operating with local session fallback.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Prometheus Metrics View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Parsed Prometheus Metrics</h4>
              <p className="text-xs text-slate-500">Exposed via /metrics for Prometheus scrapers</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyRaw}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Raw Output'}
            </Button>
          </div>

          {/* Parsed Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(metrics?.parsed || []).map((m, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 truncate" title={m.name}>
                    {m.name}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {m.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{m.help}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {m.labels ? (
                    <span className="font-mono text-[10px] text-indigo-600 truncate max-w-[160px]">
                      {JSON.stringify(m.labels).replace(/[{""}]/g, '')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Default gauge</span>
                  )}
                  <span className="text-base font-extrabold text-slate-900">{m.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Raw Text Output */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-600" />
                <CardTitle>Raw Scraper Output (/metrics)</CardTitle>
              </div>
            </CardHeader>
            <pre className="p-4 bg-slate-950 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-72 scrollbar-thin">
              {metrics?.raw}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
};
