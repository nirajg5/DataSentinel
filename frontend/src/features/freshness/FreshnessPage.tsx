import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { freshnessApi } from '../../services/api/freshnessApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { FreshnessResult } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Calendar,
} from 'lucide-react';

export const FreshnessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();
  const initialName = searchParams.get('dataset_name') || 'ecommerce_orders';

  const [datasetName, setDatasetName] = useState<string>(initialName);
  const [thresholdMin, setThresholdMin] = useState<string>('60');
  const [result, setResult] = useState<FreshnessResult | null>(null);

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await freshnessApi.checkFreshness(datasetName, {
        sla_minutes_threshold: parseInt(thresholdMin, 10) || 60,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      addToast({
        type: data.is_fresh ? 'success' : 'warning',
        title: `Freshness Check Complete: ${data.dataset_name}`,
        message: data.is_fresh
          ? `Dataset is Fresh (Age: ${data.age_minutes}m, SLA: ${data.sla_threshold_min}m)`
          : `SLA BREACH DETECTED: Dataset is ${data.age_minutes}m old (Threshold: ${data.sla_threshold_min}m)`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Freshness Check Failed',
        message: err.message,
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Freshness &amp; SLAs</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate partition update delay against defined Service Level Agreements (POST /freshness/check/{'{dataset_name}'})
        </p>
      </div>

      {/* SLA Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Dataset SLA Freshness</CardTitle>
          <p className="text-xs text-slate-500">
            Compare latest partition write timestamp against wall-clock time
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-80">
              <Select
                label="Target Dataset"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              >
                {(datasetsData?.data || []).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.layer})
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Input
                label="SLA Threshold (Minutes)"
                type="number"
                value={thresholdMin}
                onChange={(e) => setThresholdMin(e.target.value)}
              />
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Check Freshness SLA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Freshness Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Freshness Status"
              value={result.is_fresh ? 'COMPLIANT' : 'SLA BREACH'}
              subtitle={result.is_fresh ? 'Within SLA window' : 'Exceeds SLA threshold'}
              status={result.is_fresh ? 'healthy' : 'critical'}
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="Dataset Age"
              value={`${result.age_minutes} min`}
              subtitle={`Last updated: ${new Date(result.last_updated).toLocaleTimeString()}`}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatCard
              title="Allowed SLA Window"
              value={`${result.sla_threshold_min} min`}
              subtitle="Max permissible latency"
              icon={<Zap className="w-4 h-4" />}
            />
            <StatCard
              title="SLA Variance"
              value={`${result.sla_variance_min !== undefined ? (result.sla_variance_min > 0 ? `+${result.sla_variance_min}` : result.sla_variance_min) : 0} min`}
              subtitle={
                result.sla_variance_min !== undefined && result.sla_variance_min > 0
                  ? 'Overdue delay'
                  : 'Time to breach'
              }
              status={
                result.sla_variance_min !== undefined && result.sla_variance_min > 0
                  ? 'critical'
                  : 'healthy'
              }
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SLA Diagnostic Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div
                className={`p-4 rounded-xl border ${
                  result.is_fresh
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                  {result.is_fresh ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>
                    {result.is_fresh
                      ? `Dataset ${result.dataset_name} is Fresh and On-Schedule`
                      : `Critical Freshness SLA Breach Detected for ${result.dataset_name}`}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {result.is_fresh
                    ? `The latest partition timestamp (${new Date(result.last_updated).toISOString()}) was observed 
                    ${result.age_minutes} minutes ago, which is well within the configured SLA threshold of ${result.sla_threshold_min} minutes.`
                    : `The latest partition timestamp (${new Date(result.last_updated).toISOString()}) is ${result.age_minutes} minutes old, 
                    exceeding the ${result.sla_threshold_min} minute threshold by ${result.sla_variance_min || 0} minutes. Upstream data pipeline may be stalled.`}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Dataset Identifier</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{result.dataset_name}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Checked At</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {new Date(result.checked_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status Classification</span>
                  <p className="font-bold text-slate-900 mt-0.5 uppercase">{result.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Freshness Check Executed</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Choose a dataset and trigger a freshness check to evaluate update latencies against SLA rules.
          </p>
        </div>
      )}
    </div>
  );
};
