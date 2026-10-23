import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reliabilityApi } from '../../services/api/reliabilityApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { ReliabilityScoreResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useConfig } from '../../context/ConfigContext';
import {
  Activity,
  Award,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ReliabilityPage: React.FC = () => {
  const { addToast } = useConfig();
  const [datasetType, setDatasetType] = useState('ecommerce_orders');
  const [windowDays, setWindowDays] = useState('30');
  const [result, setResult] = useState<ReliabilityScoreResponse | null>(null);

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await reliabilityApi.calculateReliability(datasetType, {
        window_days: parseInt(windowDays, 10) || 30,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      addToast({
        type: 'success',
        title: `Reliability Calculated: ${data.dataset_type}`,
        message: `Score: ${data.score}/100 (Grade ${data.grade}). Uptime: ${data.uptime_percentage}%.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Reliability Calculation Failed',
        message: err.message,
      });
    },
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'B':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-rose-600 bg-rose-50 border-rose-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Composite Reliability Index</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quantify SLA uptime, MTTR (Mean Time to Recovery), and incident failure frequency (POST /reliability/calculate/{'{dataset_type}'})
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calculate Reliability Index</CardTitle>
          <p className="text-xs text-slate-500">
            Select domain and calculation window to evaluate reliability grade
          </p>
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

            <div className="w-full sm:w-48">
              <Select
                label="Evaluation Window"
                value={windowDays}
                onChange={(e) => setWindowDays(e.target.value)}
              >
                <option value="7">7 Days Window</option>
                <option value="14">14 Days Window</option>
                <option value="30">30 Days Window (Standard)</option>
                <option value="90">90 Days Window (Quarterly)</option>
              </Select>
            </div>

            <div className="pt-5 sm:ml-auto">
              <Button
                variant="primary"
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate()}
                leftIcon={<Play className="w-4 h-4" />}
              >
                Calculate Reliability
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Grade</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-3xl font-extrabold px-3 py-0.5 rounded-lg border ${getGradeColor(
                      result.grade
                    )}`}
                  >
                    {result.grade}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{result.score}/100</span>
                </div>
              </div>
              <Award className="w-8 h-8 text-indigo-500 opacity-80" />
            </div>

            <StatCard
              title="Table Uptime"
              value={`${result.uptime_percentage}%`}
              status={result.uptime_percentage >= 99 ? 'healthy' : 'warning'}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              title="Failure Rate"
              value={`${(result.failure_frequency * 100).toFixed(1)}%`}
              subtitle="Failed pipeline fraction"
              status={result.failure_frequency <= 0.05 ? 'healthy' : 'critical'}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <StatCard
              title="MTTR (Mean Recovery)"
              value={`${result.mttr_minutes} min`}
              subtitle="Average incident resolution"
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="Data Loss Ratio"
              value={`${(result.data_loss_percentage * 100).toFixed(2)}%`}
              subtitle="Quarantined records"
              status={result.data_loss_percentage === 0 ? 'healthy' : 'warning'}
              icon={<Award className="w-4 h-4" />}
            />
          </div>

          {/* Historical Trend Chart */}
          {result.historical_scores && result.historical_scores.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Historical Reliability Score (7-Day Trend)</CardTitle>
                  <p className="text-xs text-slate-500">Daily SLA reliability trajectory for {result.dataset_type}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.historical_scores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#4f46e5' }}
                        activeDot={{ r: 6 }}
                        name="Reliability Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">No Reliability Calculation Run</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select a dataset domain above and click "Calculate Reliability" to generate DORA and SLA metrics.
          </p>
        </div>
      )}
    </div>
  );
};
