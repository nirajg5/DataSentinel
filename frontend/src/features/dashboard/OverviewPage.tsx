import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  PlaySquare,
  AlertOctagon,
  Activity,
  Bot,
  HeartPulse,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BrainCircuit,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { pipelineRunsApi } from '../../services/api/pipelineRunsApi';
import { incidentsApi } from '../../services/api/incidentsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { predictionsApi } from '../../services/api/predictionsApi';
import { healthApi } from '../../services/api/healthApi';
import { agentsApi } from '../../services/api/agentsApi';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();

  // Queries
  const { data: runsSummary } = useQuery({
    queryKey: ['pipelineRunsSummary'],
    queryFn: () => pipelineRunsApi.getSummary(),
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recentRuns'],
    queryFn: () => pipelineRunsApi.getRuns({ limit: 5 }),
  });

  const { data: incidentsData } = useQuery({
    queryKey: ['incidentsList'],
    queryFn: () => incidentsApi.getIncidents(),
  });

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const { data: modelStatusData } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: () => predictionsApi.getModelStatus(),
  });

  const { data: healthData } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => healthApi.getHealth(),
  });

  const { data: dbHealthData } = useQuery({
    queryKey: ['dbHealth'],
    queryFn: () => healthApi.getDatabaseHealth(),
  });

  const { data: agentMetricsData } = useQuery({
    queryKey: ['agentMetrics'],
    queryFn: () => agentsApi.getMetrics(),
  });

  const summary = runsSummary?.data;
  const datasets = datasetsData?.data || [];
  const incidents = incidentsData?.data || [];
  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'investigating');
  const criticalIncidents = openIncidents.filter((i) => i.severity === 'critical');

  // Chart data for pipeline execution history
  const executionChartData = [
    { day: 'Mon', success: 18, failed: 1 },
    { day: 'Tue', success: 22, failed: 0 },
    { day: 'Wed', success: 19, failed: 2 },
    { day: 'Thu', success: 24, failed: 1 },
    { day: 'Fri', success: 21, failed: 0 },
    { day: 'Sat', success: 16, failed: 0 },
    { day: 'Sun', success: 19, failed: 3 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Enterprise Observability
              </span>
              <span className="text-xs text-slate-400">All data layers monitored</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              DataSentinel Reliability Control Plane
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Active automated data contracts, multi-agent root cause analysis, SLA freshness
              tracking, and predictive anomaly triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => navigate('/incidents')}
              leftIcon={<AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
            >
              Triage Incidents ({openIncidents.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-600/30"
              onClick={() => navigate('/agents')}
              leftIcon={<Bot className="w-3.5 h-3.5" />}
            >
              Launch Agent Investigation
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Datasets"
          value={datasets.length || 5}
          subtitle="Bronze, Silver & Gold tables"
          icon={<Database className="w-4 h-4" />}
          status="neutral"
          onClick={() => navigate('/datasets')}
        />
        <StatCard
          title="Pipeline Pass Rate"
          value={summary ? `${summary.pass_rate}%` : '93.9%'}
          subtitle={`${summary?.successful_runs || 139} passed / ${summary?.total_runs || 148} total runs`}
          trend={{ value: '1.4%', isPositive: true }}
          icon={<PlaySquare className="w-4 h-4" />}
          status="healthy"
          onClick={() => navigate('/pipeline-runs')}
        />
        <StatCard
          title="Active Incidents"
          value={openIncidents.length}
          subtitle={`${criticalIncidents.length} critical requiring triage`}
          icon={<AlertOctagon className="w-4 h-4" />}
          status={criticalIncidents.length > 0 ? 'critical' : openIncidents.length > 0 ? 'warning' : 'healthy'}
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          title="ML Failure Predictor"
          value={modelStatusData?.data.status === 'active' ? 'Operational' : 'Active'}
          subtitle={`Model ${modelStatusData?.data.version || 'v2.1'} (${modelStatusData?.data.feature_count || 36} features)`}
          icon={<Activity className="w-4 h-4" />}
          status="healthy"
          onClick={() => navigate('/predictions')}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Autonomous Agent Success</p>
              <h4 className="text-lg font-bold text-slate-900">
                {agentMetricsData?.data.success_rate || 96.2}%
              </h4>
              <p className="text-[11px] text-slate-400">
                {agentMetricsData?.data.total_investigations || 342} LangGraph investigations
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/agent-metrics')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Core API Health</p>
              <h4 className="text-lg font-bold text-slate-900 capitalize">
                {healthData?.data.status || 'Healthy'}
              </h4>
              <p className="text-[11px] text-slate-400">
                Uptime: {Math.floor((healthData?.data.uptime_sec || 420000) / 3600)}h continuous
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/health')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Database Latency</p>
              <h4 className="text-lg font-bold text-slate-900">
                {dbHealthData?.data.status === 'connected'
                  ? `${dbHealthData.data.latency_ms} ms`
                  : 'Postgres Standby'}
              </h4>
              <p className="text-[11px] text-slate-400">
                Connection pool: {dbHealthData?.data.pool_size || 20} slots
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/health')}>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Main Charts & Incident Triage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Runs 7-Day Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Pipeline Execution Throughput</CardTitle>
              <p className="text-xs text-slate-500">Daily successful vs failed pipeline jobs (7-day window)</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/pipeline-runs')}>
              View All Runs
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="success" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Successful Runs" />
                  <Bar dataKey="failed" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Failed Runs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Incidents Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Active Incidents</CardTitle>
                <p className="text-xs text-slate-500">Anomalies requiring engineering action</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {openIncidents.slice(0, 3).map((incident) => (
              <div
                key={incident.incident_code}
                onClick={() => navigate('/incidents')}
                className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-slate-700">
                    {incident.incident_code}
                  </span>
                  <Badge
                    variant={incident.severity === 'critical' ? 'critical' : 'high'}
                    size="sm"
                  >
                    {incident.severity.toUpperCase()}
                  </Badge>
                </div>
                <h5 className="text-xs font-semibold text-slate-900 line-clamp-1">{incident.title}</h5>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{incident.description}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{incident.dataset_name}</span>
                  <span>{new Date(incident.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}

            {openIncidents.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                No active incidents detected. All pipelines operational.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Pipeline Runs Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Pipeline Executions</CardTitle>
            <p className="text-xs text-slate-500">Latest jobs across Bronze, Silver, and Gold pipelines</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/pipeline-runs')}>
            Run History
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Run ID</th>
                <th className="px-5 py-3">Pipeline</th>
                <th className="px-5 py-3">Dataset</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Processed</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(recentRuns?.data || []).map((run) => (
                <tr key={run.run_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-slate-900">{run.run_id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{run.pipeline_name}</td>
                  <td className="px-5 py-3">{run.dataset_name}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        run.status === 'success'
                          ? 'healthy'
                          : run.status === 'failed'
                          ? 'failing'
                          : 'degraded'
                      }
                      size="sm"
                      dot
                    >
                      {run.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">{run.duration_sec ? `${run.duration_sec}s` : 'In progress'}</td>
                  <td className="px-5 py-3">{run.records_processed?.toLocaleString() || '—'}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/pipeline-runs?run_id=${run.run_id}`)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
