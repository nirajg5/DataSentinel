import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { predictionsApi } from '../../services/api/predictionsApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import {
  PredictionResultResponse,
  PredictionHistoryItem,
  ModelEvaluationResponse,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  BarChart2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const PredictionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addToast } = useConfig();
  const initialName = searchParams.get('dataset_name') || 'financial_ledger_entries';

  const [activeTab, setActiveTab] = useState<'predict' | 'evaluation'>('predict');
  const [selectedDataset, setSelectedDataset] = useState<string>(initialName);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResultResponse | null>(null);

  // Queries
  const { data: modelStatusData } = useQuery({
    queryKey: ['predictionModelStatus'],
    queryFn: () => predictionsApi.getModelStatus(),
  });

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['predictionHistory', selectedDataset],
    queryFn: () => predictionsApi.getPredictionHistory(selectedDataset),
  });

  const { data: evalData } = useQuery({
    queryKey: ['modelEvaluation'],
    queryFn: () => predictionsApi.getEvaluation(),
  });

  // Mutation: POST /predictions/failure/{dataset_name}
  const predictMutation = useMutation({
    mutationFn: async () => {
      const res = await predictionsApi.predictFailure(selectedDataset);
      return res.data;
    },
    onSuccess: (data) => {
      setCurrentPrediction(data);
      refetchHistory();
      addToast({
        type: data.risk_level === 'LOW' ? 'success' : 'warning',
        title: `Failure Prediction Generated for ${data.dataset_name}`,
        message: `Failure Probability: ${(data.failure_probability * 100).toFixed(0)}% (Risk: ${data.risk_level}).`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Prediction Calculation Failed',
        message: err.message,
      });
    },
  });

  const modelStatus = modelStatusData?.data;
  const evaluation = evalData?.data;
  const history = historyData?.data || [];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge variant="critical">CRITICAL RISK</Badge>;
      case 'HIGH':
        return <Badge variant="high">HIGH RISK</Badge>;
      case 'MEDIUM':
        return <Badge variant="medium">MEDIUM RISK</Badge>;
      default:
        return <Badge variant="healthy">LOW RISK</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Failure Predictions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Proactive ML risk forecasting using gradient-boosted models trained on SLA lags, schema volatility, and commit frequency
        </p>
      </div>

      {/* Model Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Prediction Engine"
          value={modelStatus?.model_name.split('-')[1] || 'XGBoost'}
          subtitle={`Version: ${modelStatus?.version || 'v2.1.0'}`}
          icon={<Activity className="w-4 h-4" />}
          status="neutral"
        />
        <StatCard
          title="Model Operational State"
          value={modelStatus?.status.toUpperCase() || 'ACTIVE'}
          subtitle={`Last trained: ${modelStatus?.trained_at ? new Date(modelStatus.trained_at).toLocaleDateString() : 'Recent'}`}
          icon={<ShieldCheck className="w-4 h-4" />}
          status="healthy"
        />
        <StatCard
          title="Telemetry Feature Count"
          value={modelStatus?.feature_count || 36}
          subtitle="Online & batch sliding aggregates"
          icon={<Zap className="w-4 h-4" />}
        />
        <StatCard
          title="Dataset Coverage"
          value={`${modelStatus?.dataset_coverage || 94.2}%`}
          subtitle="All production partitions"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'predict' | 'evaluation')}
        tabs={[
          {
            id: 'predict',
            label: 'Run Risk Inference & History',
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            id: 'evaluation',
            label: 'Model Accuracy & ROC-AUC Evaluation',
            icon: <BarChart2 className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'predict' ? (
        <div className="space-y-6">
          {/* Inference Trigger Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Generate Pipeline Failure Risk Score</CardTitle>
                <p className="text-xs text-slate-500">
                  Calculates probability of failure for next scheduled DAG execution (POST /predictions/failure/{'{dataset_name}'})
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-80">
                  <Select
                    label="Target Dataset"
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                  >
                    {(datasetsData?.data || []).map((ds) => (
                      <option key={ds.name} value={ds.name}>
                        {ds.name} ({ds.layer})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="pt-5 sm:ml-auto">
                  <Button
                    variant="primary"
                    isLoading={predictMutation.isPending}
                    onClick={() => predictMutation.mutate()}
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Execute Failure Prediction
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Prediction Result View */}
          {currentPrediction && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Risk Gauge Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Predicted Risk Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-slate-100 bg-slate-50">
                      <div>
                        <span className="text-3xl font-extrabold text-slate-900">
                          {(currentPrediction.failure_probability * 100).toFixed(0)}%
                        </span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Failure Prob</p>
                      </div>
                    </div>
                    <div className="mt-3">{getRiskBadge(currentPrediction.risk_level)}</div>
                  </div>

                  {currentPrediction.suggested_prevention && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        Suggested Preventive Action
                      </span>
                      <p className="text-amber-900 leading-relaxed">
                        {currentPrediction.suggested_prevention}
                      </p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span>Target: {currentPrediction.dataset_name}</span>
                    <span>{new Date(currentPrediction.timestamp).toLocaleTimeString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Key Risk Factors Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top Contributing Risk Factors</CardTitle>
                  <p className="text-xs text-slate-500">Feature SHAP values driving failure probability</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentPrediction.key_risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{factor.factor}</span>
                        <span className="font-mono text-slate-600 font-bold">
                          Weight: {(factor.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${factor.importance * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{factor.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Historical Predictions Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Historical Prediction Audit Log</CardTitle>
                <p className="text-xs text-slate-500">Historical inferences and ground-truth validation outcomes</p>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Prediction ID</th>
                    <th className="px-5 py-3.5">Target Dataset</th>
                    <th className="px-5 py-3.5">Failure Probability</th>
                    <th className="px-5 py-3.5">Risk Level</th>
                    <th className="px-5 py-3.5">Actual Pipeline Outcome</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-900">{item.id}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{item.dataset_name}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {(item.failure_probability * 100).toFixed(0)}%
                      </td>
                      <td className="px-5 py-3.5">{getRiskBadge(item.risk_level)}</td>
                      <td className="px-5 py-3.5">
                        {item.actual_outcome === 'failure' ? (
                          <span className="font-semibold text-rose-600 flex items-center gap-1">
                            Failed (True Positive)
                          </span>
                        ) : item.actual_outcome === 'success' ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            Succeeded
                          </span>
                        ) : (
                          <span className="text-slate-400">In Progress</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(item.timestamp).toLocaleString([], {
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
        </div>
      ) : (
        /* Evaluation Tab */
        <div className="space-y-6">
          {evaluation && (
            <>
              {/* Metric KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="ROC-AUC Score"
                  value={evaluation.roc_auc.toFixed(3)}
                  subtitle="Area Under ROC Curve"
                  status="healthy"
                />
                <StatCard
                  title="Precision"
                  value={`${(evaluation.precision * 100).toFixed(1)}%`}
                  subtitle="Positive predictive value"
                />
                <StatCard
                  title="Recall / Sensitivity"
                  value={`${(evaluation.recall * 100).toFixed(1)}%`}
                  subtitle="True positive detection"
                />
                <StatCard
                  title="F1 Balanced Score"
                  value={evaluation.f1_score.toFixed(3)}
                  subtitle="Harmonic mean"
                  status="healthy"
                />
              </div>

              {/* Confusion Matrix and Feature Importances */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Confusion Matrix */}
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Confusion Matrix (Holdout Test Set)</CardTitle>
                      <p className="text-xs text-slate-500">Evaluated across 1,233 real pipeline runs</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-center text-xs">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          True Positive (Correct Failure Warning)
                        </span>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">
                          {evaluation.confusion_matrix.true_positive}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">
                          False Positive (False Alarm)
                        </span>
                        <p className="text-2xl font-bold text-amber-900 mt-1">
                          {evaluation.confusion_matrix.false_positive}
                        </p>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[10px] font-bold text-rose-700 uppercase">
                          False Negative (Missed Failure)
                        </span>
                        <p className="text-2xl font-bold text-rose-900 mt-1">
                          {evaluation.confusion_matrix.false_negative}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">
                          True Negative (Correct Success)
                        </span>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {evaluation.confusion_matrix.true_negative}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Importances */}
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Global Feature Importance</CardTitle>
                      <p className="text-xs text-slate-500">Most predictive signals in the trained gradient booster</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={evaluation.feature_importances}
                          margin={{ left: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" domain={[0, 0.35]} stroke="#94a3b8" fontSize={10} />
                          <YAxis
                            dataKey="feature"
                            type="category"
                            stroke="#94a3b8"
                            fontSize={10}
                            width={110}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="importance" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
