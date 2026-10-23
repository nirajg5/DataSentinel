import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { qualityApi } from '../../services/api/qualityApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { QualityCheckResult, QualityRuleCheck } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';

export const QualityPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();
  const initialType = searchParams.get('dataset_type') || 'ecommerce_orders';

  const [datasetType, setDatasetType] = useState<string>(initialType);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string>('all');

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const [result, setResult] = useState<QualityCheckResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await qualityApi.runQualityCheck(datasetType, { strict_mode: strictMode });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      addToast({
        type: data.status === 'passed' ? 'success' : 'warning',
        title: `Quality Suite Completed for ${data.dataset_type}`,
        message: `Pass rate: ${data.pass_rate}% (${data.passed_checks}/${data.total_checks} assertions passed).`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Quality Check Failed',
        message: err.message,
      });
    },
  });

  const filteredChecks = result?.checks.filter((chk) => {
    if (selectedRuleFilter === 'all') return true;
    return chk.status === selectedRuleFilter;
  }) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Quality &amp; Assertions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute Great Expectations and Pydantic contract validation rules against live tables (POST /quality/check/{'{dataset_type}'})
        </p>
      </div>

      {/* Trigger & Config Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Run Quality Evaluation Checkpoint</CardTitle>
            <p className="text-xs text-slate-500">
              Select dataset domain to execute nullity, range, uniqueness, and relational integrity assertions
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-80">
              <Select
                label="Target Dataset Domain"
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value)}
              >
                <option value="ecommerce_orders">ecommerce_orders (transactions)</option>
                <option value="financial_ledger_entries">financial_ledger_entries (accounting)</option>
                <option value="customer_churn_features">customer_churn_features (ml_features)</option>
                <option value="telemetry_device_logs">telemetry_device_logs (iot_events)</option>
                <option value="clickstream_web_events">clickstream_web_events (behavioral)</option>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Strict Mode (Halt on warning)</span>
              </label>
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Execute Quality Suite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Pass Rate"
              value={`${result.pass_rate}%`}
              status={result.pass_rate >= 95 ? 'healthy' : result.pass_rate >= 80 ? 'warning' : 'critical'}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              title="Total Rules Evaluated"
              value={result.total_checks}
              icon={<Sparkles className="w-4 h-4" />}
            />
            <StatCard
              title="Passed Rules"
              value={result.passed_checks}
              status="healthy"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              title="Failed Rules"
              value={result.failed_checks}
              status={result.failed_checks > 0 ? 'critical' : 'healthy'}
              icon={<XCircle className="w-4 h-4" />}
            />
          </div>

          {/* Rule Details Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assertion Results Breakdown</CardTitle>
                <p className="text-xs text-slate-500">
                  Detailed results for checkpoint: {result.dataset_type}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Filter:</span>
                {['all', 'passed', 'failed'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setSelectedRuleFilter(flt)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      selectedRuleFilter === flt
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Assertion / Rule</th>
                    <th className="px-5 py-3.5">Target Column</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Observed Value</th>
                    <th className="px-5 py-3.5">Target Threshold</th>
                    <th className="px-5 py-3.5">Diagnostics / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChecks.map((chk, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono font-medium text-slate-900">{chk.rule_name}</p>
                        <p className="text-[11px] text-slate-400">{chk.description}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-indigo-600">
                        {chk.column_name || 'Table-level'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            chk.status === 'passed'
                              ? 'healthy'
                              : chk.status === 'failed'
                              ? 'failing'
                              : 'degraded'
                          }
                          size="sm"
                          dot
                        >
                          {chk.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-800">
                        {chk.observed_value || 'Compliant'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {chk.threshold || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5">
                        {chk.error_message ? (
                          <span className="text-rose-600 font-medium text-[11px]">
                            {chk.error_message}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px]">Passed cleanly</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Quality Run Selected</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Choose a dataset type above and click "Execute Quality Suite" to trigger validation checks.
          </p>
        </div>
      )}
    </div>
  );
};
