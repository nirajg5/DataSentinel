import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { aiAnalysisApi } from '../../services/api/aiAnalysisApi';
import { incidentsApi } from '../../services/api/incidentsApi';
import { AIAnalysisResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  BrainCircuit,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Terminal,
  Layers,
  FileCode,
  Zap,
} from 'lucide-react';

export const AiAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();
  const initialIncident = searchParams.get('incident_code') || 'INC-2026-8942';

  const [incidentCode, setIncidentCode] = useState<string>(initialIncident);
  const [demoScenario, setDemoScenario] = useState<'schema_drift' | 'null_surge' | 'pipeline_timeout' | 'upstream_outage'>('null_surge');
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);

  const { data: incidentsData } = useQuery({
    queryKey: ['incidentsList'],
    queryFn: () => incidentsApi.getIncidents(),
  });

  // Incident Analysis Mutation: POST /ai-analysis/{incident_code}
  const incidentMutation = useMutation({
    mutationFn: async () => {
      const res = await aiAnalysisApi.analyzeIncident(incidentCode);
      return res.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      addToast({
        type: 'success',
        title: `AI Root Cause Analysis Complete: ${data.incident_code}`,
        message: `Analyzed ${data.logs_analyzed} log lines with ${(data.confidence_score * 100).toFixed(0)}% confidence.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'AI Analysis Failed',
        message: err.message,
      });
    },
  });

  // Demo Analysis Mutation: POST /ai-analysis/demo
  const demoMutation = useMutation({
    mutationFn: async () => {
      const res = await aiAnalysisApi.runDemoAnalysis({ scenario: demoScenario });
      return res.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      addToast({
        type: 'info',
        title: 'AI Diagnostic Demo Simulation Completed',
        message: `Generated synthetic root-cause analysis for scenario: ${demoScenario}.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'AI Demo Failed',
        message: err.message,
      });
    },
  });

  const incidents = incidentsData?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Root Cause Diagnostics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automated LLM diagnosis of pipeline errors, stack traces, and database telemetry (POST /ai-analysis/{'{incident_code}'} and POST /ai-analysis/demo)
        </p>
      </div>

      {/* Trigger Controls Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Incident Analysis Trigger */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <CardTitle>Diagnose Active Incident</CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Evaluates execution logs and downstream schema impacts
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Select Target Incident"
              value={incidentCode}
              onChange={(e) => setIncidentCode(e.target.value)}
            >
              {incidents.map((inc) => (
                <option key={inc.incident_code} value={inc.incident_code}>
                  {inc.incident_code} — {inc.title.substring(0, 45)}... ({inc.severity})
                </option>
              ))}
            </Select>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                isLoading={incidentMutation.isPending}
                onClick={() => incidentMutation.mutate()}
                leftIcon={<BrainCircuit className="w-4 h-4" />}
              >
                Analyze Incident
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Demo Simulator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <CardTitle>AI Diagnostic Demo Sandbox</CardTitle>
            </div>
            <p className="text-xs text-slate-500">
              Simulates automated analysis of benchmark anomaly scenarios
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Simulation Failure Scenario"
              value={demoScenario}
              onChange={(e) => setDemoScenario(e.target.value as any)}
            >
              <option value="null_surge">Null Surge Spike in Upstream CDC Stream</option>
              <option value="schema_drift">Unannounced Microservice Schema Drift</option>
              <option value="pipeline_timeout">Spark Driver Garbage Collection Timeout</option>
              <option value="upstream_outage">Third-Party Gateway Webhook Outage</option>
            </Select>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                isLoading={demoMutation.isPending}
                onClick={() => demoMutation.mutate()}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Run AI Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Output Section */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Diagnostic KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Confidence Score"
              value={`${(analysisResult.confidence_score * 100).toFixed(0)}%`}
              subtitle="Diagnostic certainty"
              status={analysisResult.confidence_score >= 0.9 ? 'healthy' : 'warning'}
              icon={<Sparkles className="w-4 h-4" />}
            />
            <StatCard
              title="Telemetry Lines Scanned"
              value={analysisResult.logs_analyzed.toLocaleString()}
              subtitle="Prometheus spans & driver logs"
              icon={<Terminal className="w-4 h-4" />}
            />
            <StatCard
              title="Downstream Tables Impacted"
              value={analysisResult.affected_downstream?.length || 0}
              subtitle="Blocked downstream business marts"
              status={analysisResult.affected_downstream?.length > 0 ? 'critical' : 'healthy'}
              icon={<Layers className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Root Cause Hypothesis & Mitigation */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Root Cause Hypothesis</CardTitle>
                  <p className="text-xs text-slate-500">
                    Incident: {analysisResult.incident_code}
                  </p>
                </div>
                <Badge variant="info">AI SYNTHESIZED</Badge>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-600" />
                    Diagnostic Finding
                  </h5>
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {analysisResult.root_cause_hypothesis}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
                  <h5 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-1">
                    Impact Scope &amp; Blast Radius
                  </h5>
                  <p className="text-amber-800 leading-relaxed">
                    {analysisResult.impact_scope}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    Recommended Remediation Protocol
                  </h5>
                  <div className="text-emerald-800 leading-relaxed whitespace-pre-line font-medium">
                    {analysisResult.suggested_mitigation}
                  </div>
                </div>

                {analysisResult.suggested_query_fix && (
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-indigo-600" /> Remediation SQL Script
                    </h5>
                    <pre className="p-3 bg-slate-950 text-indigo-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                      {analysisResult.suggested_query_fix}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impacted Tables & Timeline */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Impacted Downstream Dependencies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {analysisResult.affected_downstream?.map((table) => (
                    <div
                      key={table}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-800 font-medium truncate">{table}</span>
                    </div>
                  ))}
                  {(!analysisResult.affected_downstream || analysisResult.affected_downstream.length === 0) && (
                    <p className="text-slate-400 py-4 text-center">No downstream dependencies compromised.</p>
                  )}
                </CardContent>
              </Card>

              {analysisResult.failure_timeline && analysisResult.failure_timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Anomaly Chronology</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {analysisResult.failure_timeline.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-mono text-[10px] text-slate-400">{event.timestamp}</p>
                          <p className="text-slate-800 font-medium">{event.event}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {!analysisResult && !incidentMutation.isPending && !demoMutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <BrainCircuit className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No AI Diagnostics Executed</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select an incident above to perform automated root cause analysis with Groq and Pinecone.
          </p>
        </div>
      )}
    </div>
  );
};
