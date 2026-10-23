import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { pipelineRunsApi } from '../../services/api/pipelineRunsApi';
import { PipelineRunItem, PipelineRunDetail, PipelineStatus } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  PlaySquare,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Terminal,
  Cpu,
  HardDrive,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const PipelineRunsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(searchParams.get('run_id'));

  useEffect(() => {
    const runId = searchParams.get('run_id');
    if (runId) {
      setSelectedRunId(runId);
    }
  }, [searchParams]);

  // Fetch summary
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['pipelineRunsSummary'],
    queryFn: () => pipelineRunsApi.getSummary(),
  });

  // Fetch list
  const { data: runsData, isLoading, refetch: refetchRuns } = useQuery({
    queryKey: ['pipelineRunsList', statusFilter],
    queryFn: () => pipelineRunsApi.getRuns({ status: statusFilter !== 'all' ? statusFilter : undefined }),
  });

  // Fetch run detail if selected
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['pipelineRunDetail', selectedRunId],
    queryFn: () => pipelineRunsApi.getRunById(selectedRunId!),
    enabled: !!selectedRunId,
  });

  const summary = summaryData?.data;
  const runs = runsData?.data || [];
  const runDetail = detailData?.data;

  const handleOpenDetail = (runId: string) => {
    setSelectedRunId(runId);
    setSearchParams({ run_id: runId });
  };

  const handleCloseDetail = () => {
    setSelectedRunId(null);
    setSearchParams({});
  };

  const getStatusBadge = (status: PipelineStatus) => {
    switch (status) {
      case 'success':
        return <Badge variant="healthy" size="sm" dot>SUCCESS</Badge>;
      case 'failed':
        return <Badge variant="failing" size="sm" dot>FAILED</Badge>;
      case 'running':
        return <Badge variant="degraded" size="sm" dot>RUNNING</Badge>;
      case 'queued':
        return <Badge variant="neutral" size="sm" dot>QUEUED</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" size="sm" dot>CANCELLED</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Runs History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor batch and streaming DAG execution traces, task failures, and container resource metrics
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchSummary();
            refetchRuns();
          }}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Runs
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Runs</p>
          <h4 className="text-xl font-bold text-slate-900 mt-1">{summary?.total_runs || 148}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Successful</p>
          <h4 className="text-xl font-bold text-emerald-700 mt-1">{summary?.successful_runs || 139}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Failed</p>
          <h4 className="text-xl font-bold text-rose-700 mt-1">{summary?.failed_runs || 7}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Running</p>
          <h4 className="text-xl font-bold text-amber-700 mt-1">{summary?.running_runs || 2}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Pass Rate</p>
          <h4 className="text-xl font-bold text-indigo-700 mt-1">{summary ? `${summary.pass_rate}%` : '93.9%'}</h4>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Duration</p>
          <h4 className="text-xl font-bold text-slate-900 mt-1">{summary?.avg_duration_sec || 345}s</h4>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </span>
          {['all', 'success', 'failed', 'running'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">{runs.length} runs listed</span>
      </div>

      {/* Runs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Run Identifier</th>
                <th className="px-5 py-3.5">Pipeline Name</th>
                <th className="px-5 py-3.5">Target Dataset</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Execution Duration</th>
                <th className="px-5 py-3.5">Processed Rows</th>
                <th className="px-5 py-3.5">Started At</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.run_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-medium text-slate-900">{run.run_id}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleOpenDetail(run.run_id)}
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                    >
                      {run.pipeline_name}
                    </button>
                    {run.error_message && (
                      <p className="text-[11px] text-rose-600 font-medium truncate max-w-xs mt-0.5">
                        {run.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-slate-700">{run.dataset_name}</td>
                  <td className="px-5 py-4">{getStatusBadge(run.status)}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {run.duration_sec ? `${run.duration_sec}s` : 'Running...'}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {run.records_processed ? run.records_processed.toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(run.started_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(run.run_id)}
                    >
                      Inspect Trace
                    </Button>
                  </td>
                </tr>
              ))}

              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <PlaySquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No pipeline runs matching filter "{statusFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Individual Run Detail Modal */}
      <Modal
        isOpen={!!selectedRunId}
        onClose={handleCloseDetail}
        title={runDetail?.pipeline_name || `Run Trace: ${selectedRunId}`}
        description={`Run ID: ${selectedRunId} | Dataset: ${runDetail?.dataset_name || '—'}`}
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {runDetail?.status && getStatusBadge(runDetail.status)}
              <span className="text-xs text-slate-500">
                Duration: {runDetail?.duration_sec ? `${runDetail.duration_sec}s` : 'In progress'}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCloseDetail}>
              Close Trace
            </Button>
          </div>
        }
      >
        {runDetail ? (
          <div className="space-y-5 text-xs">
            {/* Error Banner if Failed */}
            {runDetail.error_message && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Pipeline Exception Encountered
                </div>
                <p className="text-[11px] font-mono leading-relaxed bg-white/80 p-2 rounded border border-rose-200">
                  {runDetail.error_message}
                </p>
              </div>
            )}

            {/* Container Resource Telemetry */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Container Resource Consumption
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">CPU Utilization</span>
                    <p className="text-sm font-bold text-slate-900">{runDetail.metrics.cpu_usage_pct}%</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Memory Allocated</span>
                    <p className="text-sm font-bold text-slate-900">{runDetail.metrics.memory_mb} MB</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">IO Throughput</span>
                    <p className="text-sm font-bold text-slate-900">{runDetail.metrics.io_throughput_mb_s} MB/s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DAG Execution Step Waterfall */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Execution DAG Step Waterfall
              </h4>
              <div className="space-y-2">
                {runDetail.steps?.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{step.step_name}</p>
                        {step.error && <p className="text-[11px] text-rose-600 mt-0.5">{step.error}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      {step.records_processed !== undefined && (
                        <span className="text-[11px] text-slate-400">
                          {step.records_processed.toLocaleString()} records
                        </span>
                      )}
                      {step.duration_sec !== undefined && (
                        <span className="text-[11px] font-mono text-slate-600">
                          {step.duration_sec}s
                        </span>
                      )}
                      {getStatusBadge(step.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution Logs */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-600" /> Standard Output / Driver Logs
              </h4>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 scrollbar-thin">
                {runDetail.logs}
              </pre>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading execution trace...
          </div>
        )}
      </Modal>
    </div>
  );
};
