import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { incidentsApi } from '../../services/api/incidentsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { IncidentItem, IncidentSeverity, IncidentStatus } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useConfig } from '../../context/ConfigContext';
import {
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  BrainCircuit,
  Bot,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useConfig();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [datasetFilter, setDatasetFilter] = useState<string>('all');

  // Modal states
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [incidentToResolve, setIncidentToResolve] = useState<IncidentItem | null>(null);

  // Anomaly detector states
  const [detectDataset, setDetectDataset] = useState('financial_ledger_entries');
  const [detectSensitivity, setDetectSensitivity] = useState<'low' | 'medium' | 'high'>('high');

  // Queries
  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const { data: incidentsData, isLoading, refetch } = useQuery({
    queryKey: ['incidentsList', statusFilter, severityFilter, datasetFilter],
    queryFn: () =>
      incidentsApi.getIncidents({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        dataset_name: datasetFilter !== 'all' ? datasetFilter : undefined,
      }),
  });

  // Anomaly Scan Mutation: POST /incidents/detect/{dataset_name}
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await incidentsApi.detectDatasetIncidents(detectDataset, {
        sensitivity: detectSensitivity,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      addToast({
        type: data.incidents_detected > 0 ? 'warning' : 'success',
        title: `Anomaly Scan Completed (${data.scan_duration_ms}ms)`,
        message:
          data.incidents_detected > 0
            ? `Found ${data.incidents_detected} anomalies on ${data.dataset_name}: ${data.incident_codes.join(', ')}`
            : `Scan clean. No statistical anomalies detected on ${data.dataset_name}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Anomaly Scan Failed',
        message: err.message,
      });
    },
  });

  // Pipeline Failure Scan Mutation: POST /incidents/detect-pipeline-failures/{dataset_name}
  const pipelineFailScanMutation = useMutation({
    mutationFn: async () => {
      const res = await incidentsApi.detectPipelineFailures(detectDataset);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      addToast({
        type: 'info',
        title: 'Pipeline Log Failure Scanner',
        message: `Scanned logs for ${data.dataset_name}. Flagged ${data.new_failures_flagged} failure events.`,
      });
    },
  });

  // Resolve Incident Mutation: PATCH /incidents/{incident_code}/resolve
  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!incidentToResolve) return;
      const res = await incidentsApi.resolveIncident(incidentToResolve.incident_code, {
        resolution_notes: resolutionNotes,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidentsList'] });
      setResolveModalOpen(false);
      setIncidentToResolve(null);
      setResolutionNotes('');
      if (selectedIncident?.incident_code === data?.incident_code) {
        setSelectedIncident(data || null);
      }
      addToast({
        type: 'success',
        title: `Incident ${data?.incident_code} Resolved`,
        message: 'Resolution audit logged in incident registry.',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to Resolve Incident',
        message: err.message,
      });
    },
  });

  const incidents = incidentsData?.data || [];

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="critical" size="sm">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="high" size="sm">HIGH</Badge>;
      case 'medium':
        return <Badge variant="medium" size="sm">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="low" size="sm">LOW</Badge>;
      default:
        return <Badge size="sm">{sev}</Badge>;
    }
  };

  const getStatusBadge = (st: IncidentStatus) => {
    switch (st) {
      case 'open':
        return <Badge variant="critical" size="sm" dot>OPEN</Badge>;
      case 'investigating':
        return <Badge variant="degraded" size="sm" dot>INVESTIGATING</Badge>;
      case 'resolved':
        return <Badge variant="healthy" size="sm" dot>RESOLVED</Badge>;
      case 'dismissed':
        return <Badge variant="neutral" size="sm">DISMISSED</Badge>;
      default:
        return <Badge size="sm">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Incident Management &amp; Triage</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detect table anomalies (POST /incidents/detect), triage pipeline failures, and resolve incidents with audit notes
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Detection Trigger Banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <CardTitle>Automated Anomaly &amp; Pipeline Scanner</CardTitle>
          </div>
          <p className="text-xs text-slate-500">
            Execute online statistical variance and pipeline log scans
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-72">
              <Select
                label="Target Dataset"
                value={detectDataset}
                onChange={(e) => setDetectDataset(e.target.value)}
              >
                {(datasetsData?.data || []).map((ds) => (
                  <option key={ds.name} value={ds.name}>
                    {ds.name} ({ds.layer})
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select
                label="Scan Sensitivity"
                value={detectSensitivity}
                onChange={(e) => setDetectSensitivity(e.target.value as any)}
              >
                <option value="low">Low (3-Sigma)</option>
                <option value="medium">Medium (2-Sigma)</option>
                <option value="high">High (1.5-Sigma)</option>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-5 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                isLoading={pipelineFailScanMutation.isPending}
                onClick={() => pipelineFailScanMutation.mutate()}
              >
                Detect Pipeline Failures
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={scanMutation.isPending}
                onClick={() => scanMutation.mutate()}
                leftIcon={<AlertOctagon className="w-4 h-4" />}
              >
                Detect Anomaly Incidents
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            {['all', 'open', 'investigating', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-slate-400 font-medium">Severity:</span>
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <span className="text-slate-400 font-medium">{incidents.length} incidents found</span>
      </div>

      {/* Incidents Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Incident Code</th>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Title &amp; Impact Description</th>
                <th className="px-5 py-3.5">Dataset / Pipeline</th>
                <th className="px-5 py-3.5">Detected At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map((inc) => (
                <tr key={inc.incident_code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">
                    <button
                      onClick={() => setSelectedIncident(inc)}
                      className="hover:text-indigo-600 cursor-pointer"
                    >
                      {inc.incident_code}
                    </button>
                  </td>
                  <td className="px-5 py-4">{getSeverityBadge(inc.severity)}</td>
                  <td className="px-5 py-4">{getStatusBadge(inc.status)}</td>
                  <td className="px-5 py-4 max-w-md">
                    <h5 className="font-semibold text-slate-900">{inc.title}</h5>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{inc.description}</p>
                    {inc.anomaly_metric && (
                      <span className="inline-block mt-1 font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inc.anomaly_metric}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-mono text-slate-800">{inc.dataset_name}</p>
                    {inc.pipeline_id && (
                      <p className="text-[10px] font-mono text-slate-400">{inc.pipeline_id}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(inc.detected_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        Inspect
                      </Button>
                      {inc.status !== 'resolved' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setIncidentToResolve(inc);
                            setResolveModalOpen(true);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {incidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    No incidents matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incident Detail Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident?.title || 'Incident Inspection'}
        description={`Code: ${selectedIncident?.incident_code} | Target: ${selectedIncident?.dataset_name}`}
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const code = selectedIncident?.incident_code;
                  setSelectedIncident(null);
                  navigate(`/ai-analysis?incident_code=${code}`);
                }}
                leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
              >
                AI Root Cause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const code = selectedIncident?.incident_code;
                  setSelectedIncident(null);
                  navigate(`/agents?incident_code=${code}`);
                }}
                leftIcon={<Bot className="w-3.5 h-3.5" />}
              >
                Agent Investigate
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {selectedIncident && selectedIncident.status !== 'resolved' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => {
                    setIncidentToResolve(selectedIncident);
                    setResolveModalOpen(true);
                  }}
                >
                  Resolve Incident
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedIncident(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedIncident && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              {getSeverityBadge(selectedIncident.severity)}
              {getStatusBadge(selectedIncident.status)}
              <span className="text-slate-400 ml-auto">
                Detected: {new Date(selectedIncident.detected_at).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h5 className="font-semibold text-slate-900">Incident Narrative</h5>
              <p className="text-slate-700 leading-relaxed">{selectedIncident.description}</p>
            </div>

            {selectedIncident.anomaly_metric && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                  Triggered Metric Violation
                </span>
                <p className="font-mono text-amber-900 font-medium">{selectedIncident.anomaly_metric}</p>
              </div>
            )}

            {selectedIncident.root_cause && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-0.5">
                  Identified Root Cause
                </span>
                <p className="text-indigo-900 font-medium">{selectedIncident.root_cause}</p>
              </div>
            )}

            {selectedIncident.status === 'resolved' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                  Resolution Notes (Audit Trail)
                </span>
                <p className="text-emerald-900 leading-relaxed">
                  {selectedIncident.resolution_notes || 'Resolved by engineering lead.'}
                </p>
                {selectedIncident.resolved_at && (
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Timestamp: {new Date(selectedIncident.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Incident Confirmation Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title={`Resolve Incident: ${incidentToResolve?.incident_code}`}
        description="Provide mandatory resolution notes for audit compliance (PATCH /incidents/{incident_code}/resolve)"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={resolveMutation.isPending}
              disabled={!resolutionNotes.trim()}
              onClick={() => resolveMutation.mutate()}
            >
              Confirm Resolution
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            You are about to mark incident <strong>{incidentToResolve?.incident_code}</strong> as RESOLVED.
            Please record the corrective action taken (e.g., schema migration applied, idempotency window expanded, dead letter queue purged).
          </p>

          <Textarea
            label="Resolution Details / Fix Summary"
            rows={4}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="e.g. Applied upstream schema patch to coalesce null account_codes and re-ran Silver ETL."
            required
          />
        </div>
      </Modal>
    </div>
  );
};
