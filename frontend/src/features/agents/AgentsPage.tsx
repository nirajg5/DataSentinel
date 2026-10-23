import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { agentsApi } from '../../services/api/agentsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import {
  AgentInvestigateRequest,
  AgentInvestigationResult,
  TaskStatusResponse,
  AgentStep,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bot,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Activity,
  History,
  AlertOctagon,
} from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useConfig();
  const { isAdmin } = useAuth();

  const initialIncident = searchParams.get('incident_code') || '';

  // Form states
  const [datasetName, setDatasetName] = useState('financial_ledger_entries');
  const [incidentCode, setIncidentCode] = useState(initialIncident);
  const [query, setQuery] = useState(
    'Identify why debit/credit balance constraint failed and formulate mitigation steps.'
  );
  const [dispatchMode, setDispatchMode] = useState<'sync' | 'async'>('async');

  // Async Polling State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<TaskStatusResponse | null>(null);
  const [activeResult, setActiveResult] = useState<AgentInvestigationResult | null>(null);

  // Stale recovery modal
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [olderThanMinutes, setOlderThanMinutes] = useState('30');

  // Datasets query
  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  // History query
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['agentHistory'],
    queryFn: () => agentsApi.getHistory(),
  });

  // Polling loop for Async Celery task
  useEffect(() => {
    if (!activeTaskId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const { data } = await agentsApi.getTaskStatus(activeTaskId);
        if (!isSubscribed) return;

        setPollingStatus(data);

        // Check for terminal status
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setActiveTaskId(null);
          if (data.result) {
            setActiveResult(data.result);
            queryClient.invalidateQueries({ queryKey: ['agentHistory'] });
            addToast({
              type: data.status === 'completed' ? 'success' : 'error',
              title: `Agent Investigation Finished (${data.status.toUpperCase()})`,
              message: `Completed with ${(data.result.confidence * 100).toFixed(0)}% diagnostic confidence.`,
            });
          }
        }
      } catch (err) {
        clearInterval(interval);
        setActiveTaskId(null);
        addToast({
          type: 'error',
          title: 'Polling Failed',
          message: err instanceof Error ? err.message : 'Task status poll error',
        });
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeTaskId, queryClient, addToast]);

  // Synchronous Investigation Mutation
  const syncMutation = useMutation({
    mutationFn: async (payload: AgentInvestigateRequest) => {
      const res = await agentsApi.investigateSync(payload);
      return res.data;
    },
    onSuccess: (data) => {
      setActiveResult(data);
      refetchHistory();
      addToast({
        type: 'success',
        title: 'Synchronous Investigation Complete',
        message: `LangGraph executed ${data.steps_taken.length} agent steps in ${data.total_duration_sec}s.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Investigation Failed',
        message: err.message,
      });
    },
  });

  // Asynchronous Investigation Mutation
  const asyncMutation = useMutation({
    mutationFn: async (payload: AgentInvestigateRequest) => {
      const res = await agentsApi.investigateAsync(payload);
      return res.data;
    },
    onSuccess: (data) => {
      setActiveTaskId(data.task_id);
      setPollingStatus({
        task_id: data.task_id,
        status: 'queued',
        progress: 10,
        current_step: 'Task dispatched to Celery Redis queue...',
      });
      addToast({
        type: 'info',
        title: 'Asynchronous Task Dispatched',
        message: `Task ID: ${data.task_id}. Polling execution status...`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Async Dispatch Failed',
        message: err.message,
      });
    },
  });

  // Stale Recovery Mutation: POST /agent/maintenance/recover-stale
  const recoverMutation = useMutation({
    mutationFn: async () => {
      const res = await agentsApi.recoverStale({
        older_than_minutes: parseInt(olderThanMinutes, 10) || 30,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setRecoverModalOpen(false);
      refetchHistory();
      addToast({
        type: 'success',
        title: 'Stale Task Maintenance Complete',
        message: data.message,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Maintenance Operation Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AgentInvestigateRequest = {
      dataset_name: datasetName,
      incident_code: incidentCode || undefined,
      query: query.trim(),
    };

    if (dispatchMode === 'sync') {
      syncMutation.mutate(payload);
    } else {
      asyncMutation.mutate(payload);
    }
  };

  const history = historyData?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            LangGraph Autonomous Agent Investigations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-agent cooperative root cause investigation with telemetry analysis, data contract audits, and runbook synthesis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecoverModalOpen(true)}
            leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
          >
            Recover Stale Tasks
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <CardTitle>Launch Agent Investigation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Target Dataset"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              >
                {(datasetsData?.data || []).map((ds) => (
                  <option key={ds.name} value={ds.name}>
                    {ds.name} ({ds.layer})
                  </option>
                ))}
              </Select>

              <Input
                label="Incident Code (Optional)"
                value={incidentCode}
                onChange={(e) => setIncidentCode(e.target.value)}
                placeholder="e.g. INC-2026-8942"
              />

              <Textarea
                label="Investigation Directive / Hypothesis"
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />

              {/* Execution Mode Radio Toggle */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Execution Dispatch Flow
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      dispatchMode === 'async'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="async"
                      checked={dispatchMode === 'async'}
                      onChange={() => setDispatchMode('async')}
                      className="text-indigo-600"
                    />
                    <span>Async (Celery)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      dispatchMode === 'sync'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="sync"
                      checked={dispatchMode === 'sync'}
                      onChange={() => setDispatchMode('sync')}
                      className="text-indigo-600"
                    />
                    <span>Sync (Direct)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={syncMutation.isPending || asyncMutation.isPending || !!activeTaskId}
                  leftIcon={<Bot className="w-4 h-4" />}
                  className="w-full"
                >
                  {activeTaskId ? 'Agent Investigating...' : 'Launch Investigation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Polling & Results Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Polling Status Indicator */}
          {pollingStatus && pollingStatus.status !== 'completed' && (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-indigo-900">
                    <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>Asynchronous Investigation in Progress</span>
                  </div>
                  <span className="font-mono text-indigo-700">{pollingStatus.task_id}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pollingStatus.progress || 40}%` }}
                  />
                </div>

                <p className="text-xs text-indigo-800 font-medium font-mono">
                  {pollingStatus.current_step || 'Agent inspecting data lakehouse partition...'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Completed Investigation Result Card */}
          {activeResult && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Investigation Findings</CardTitle>
                    <p className="text-xs text-slate-500">
                      ID: {activeResult.investigation_id} | Dataset: {activeResult.dataset_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="healthy">
                      {(activeResult.confidence * 100).toFixed(0)}% Confidence
                    </Badge>
                    <Badge variant="info">{activeResult.total_duration_sec}s Execution</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 text-xs">
                  {/* Root cause */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Identified Root Cause
                    </h5>
                    <p className="text-slate-800 text-xs leading-relaxed font-medium">
                      {activeResult.root_cause}
                    </p>
                  </div>

                  {/* Mitigation steps */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                      Prescribed Mitigation Protocol
                    </h5>
                    <ul className="space-y-1.5 text-emerald-900 list-disc list-inside">
                      {activeResult.mitigation_steps.map((step, idx) => (
                        <li key={idx} className="font-medium leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Multi-Agent Execution Steps */}
                  <div>
                    <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-3">
                      Autonomous Agent Execution Trace ({activeResult.steps_taken.length} Steps)
                    </h5>
                    <div className="space-y-3">
                      {activeResult.steps_taken.map((step) => (
                        <div
                          key={step.step_number}
                          className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-indigo-700 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px] font-bold">
                                {step.step_number}
                              </span>
                              {step.agent_role}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {step.duration_ms}ms
                            </span>
                          </div>
                          <p className="font-medium text-slate-900">{step.action}</p>
                          <p className="text-slate-500 text-[11px] italic">"{step.reasoning}"</p>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                            {step.output}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!activeResult && !pollingStatus && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Bot className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-800">No Active Investigation</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Configure your hypothesis in the left panel and click Launch Investigation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Investigation History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <CardTitle>Historical Agent Investigations (GET /agent/history)</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Task ID</th>
                <th className="px-5 py-3">Dataset Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Investigation Objective / Query</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-slate-900">{item.task_id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{item.dataset_name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={item.status === 'completed' ? 'healthy' : 'failing'} size="sm" dot>
                      {item.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 max-w-sm truncate text-slate-700">{item.query}</td>
                  <td className="px-5 py-3 font-mono">{item.duration_sec}s</td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stale Task Recovery Modal */}
      <Modal
        isOpen={recoverModalOpen}
        onClose={() => setRecoverModalOpen(false)}
        title="Recover Stale Celery Tasks"
        description="Performs operational maintenance on orphaned Redis worker locks (POST /agent/maintenance/recover-stale)"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setRecoverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={recoverMutation.isPending}
              onClick={() => recoverMutation.mutate()}
            >
              Confirm Recovery
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            This administrative maintenance action will inspect the Celery task registry for investigations
            that have not transmitted a heartbeat within the specified threshold, revoke their Redis locks, and
            gracefully reconcile state.
          </p>

          <Input
            label="Stale Age Threshold (Minutes)"
            type="number"
            value={olderThanMinutes}
            onChange={(e) => setOlderThanMinutes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
