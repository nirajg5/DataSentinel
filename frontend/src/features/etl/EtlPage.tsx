import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { etlApi } from '../../services/api/etlApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import {
  SilverETLOptions,
  ETLResultResponse,
  GoldBuildRequest,
  GoldBuildResponse,
} from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useConfig } from '../../context/ConfigContext';
import {
  Workflow,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Sliders,
} from 'lucide-react';

export const EtlPage: React.FC = () => {
  const { addToast } = useConfig();
  const [activeTab, setActiveTab] = useState<'silver' | 'gold'>('silver');

  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  // Silver ETL State
  const [silverDatasetType, setSilverDatasetType] = useState('transactions');
  const [deduplicate, setDeduplicate] = useState(true);
  const [dropNulls, setDropNulls] = useState(true);
  const [validateTypes, setValidateTypes] = useState(true);
  const [customFilter, setCustomFilter] = useState('');
  const [silverResult, setSilverResult] = useState<ETLResultResponse | null>(null);

  // Gold Build State
  const [targetTable, setTargetTable] = useState('gold_daily_financial_reconciliation');
  const [aggregationCol, setAggregationCol] = useState('total_amount_usd');
  const [aggregationFunc, setAggregationFunc] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');
  const [timeWindow, setTimeWindow] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [overwrite, setOverwrite] = useState(false);
  const [goldResult, setGoldResult] = useState<GoldBuildResponse | null>(null);

  // Silver Mutation
  const silverMutation = useMutation({
    mutationFn: async () => {
      const options: SilverETLOptions = {
        deduplicate,
        drop_nulls: dropNulls,
        validate_types: validateTypes,
        custom_filter: customFilter || undefined,
      };
      const res = await etlApi.triggerSilverETL(silverDatasetType, options);
      return res.data;
    },
    onSuccess: (data) => {
      setSilverResult(data);
      addToast({
        type: 'success',
        title: 'Silver Layer ETL Completed',
        message: `Processed ${data.rows_in.toLocaleString()} rows in ${data.execution_time_sec}s. Dropped ${data.dropped_rows} anomalies.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Silver ETL Failed',
        message: err.message,
      });
    },
  });

  // Gold Mutation
  const goldMutation = useMutation({
    mutationFn: async () => {
      const payload: GoldBuildRequest = {
        target_table: targetTable,
        aggregations: [
          {
            column: aggregationCol,
            function: aggregationFunc,
            alias: `${aggregationFunc}_${aggregationCol}`,
          },
        ],
        time_window: timeWindow,
        overwrite,
      };
      const res = await etlApi.triggerGoldBuild(payload);
      return res.data;
    },
    onSuccess: (data) => {
      setGoldResult(data);
      addToast({
        type: 'success',
        title: 'Gold Layer Build Completed',
        message: `Table ${data.target_table} aggregated ${data.rows_aggregated.toLocaleString()} rows in ${data.execution_time_sec}s.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Gold Build Failed',
        message: err.message,
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">ETL &amp; Data Transformations</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute Silver layer deduplication and type coercion (POST /etl/silver/{'{dataset_type}'}) or materialize Gold business marts (POST /etl/gold/build)
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'silver' | 'gold')}
        tabs={[
          {
            id: 'silver',
            label: 'Silver Layer Transformations',
            icon: <Layers className="w-4 h-4" />,
          },
          {
            id: 'gold',
            label: 'Gold Mart Aggregations',
            icon: <Sparkles className="w-4 h-4" />,
          },
        ]}
      />

      {activeTab === 'silver' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Silver Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Trigger Silver ETL Job</CardTitle>
                <p className="text-xs text-slate-500">
                  Cleanses raw Bronze partition data, removes duplicates, and standardizes schemas
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Select Target Dataset Type"
                value={silverDatasetType}
                onChange={(e) => setSilverDatasetType(e.target.value)}
              >
                <option value="transactions">transactions (ecommerce_orders)</option>
                <option value="accounting">accounting (financial_ledger_entries)</option>
                <option value="ml_features">ml_features (customer_churn_features)</option>
                <option value="iot_events">iot_events (telemetry_device_logs)</option>
                <option value="behavioral">behavioral (clickstream_web_events)</option>
              </Select>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-700">Transformation Parameters</span>
                
                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">Deduplicate Primary Keys</p>
                    <p className="text-slate-500">Apply sliding window row hashing for idempotency</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">Drop Records With Critical Nulls</p>
                    <p className="text-slate-500">Route records missing non-nullable keys to quarantine</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={dropNulls}
                    onChange={(e) => setDropNulls(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">Enforce Strict Type Validation</p>
                    <p className="text-slate-500">Cast timestamps, decimals, and UUIDs to schema spec</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={validateTypes}
                    onChange={(e) => setValidateTypes(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>

              <Input
                label="Optional SQL Predicate Filter"
                value={customFilter}
                onChange={(e) => setCustomFilter(e.target.value)}
                placeholder="e.g. status != 'TEST_TRANSACTION'"
                hint="Filter applied during bronze scan stage"
              />

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  isLoading={silverMutation.isPending}
                  onClick={() => silverMutation.mutate()}
                  leftIcon={<Workflow className="w-4 h-4" />}
                >
                  Execute Silver ETL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Silver Execution Result */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {silverResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Status: {silverResult.status.toUpperCase()}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{silverResult.details}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows In</span>
                      <p className="text-base font-bold text-slate-900">{silverResult.rows_in.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Out</span>
                      <p className="text-base font-bold text-slate-900">{silverResult.rows_out.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Dropped</span>
                      <p className="text-base font-bold text-rose-600">{silverResult.dropped_rows.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Duration</span>
                      <p className="text-base font-bold text-slate-900">{silverResult.execution_time_sec}s</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    Completed at: {new Date(silverResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Sliders className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Select options and click Execute Silver ETL to transform data into the Silver layer.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gold Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Build Gold Business Layer</CardTitle>
                <p className="text-xs text-slate-500">
                  Calculates rolled-up financial, operational, and customer marts (POST /etl/gold/build)
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Target Mart / Table Name"
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Aggregation Column"
                  value={aggregationCol}
                  onChange={(e) => setAggregationCol(e.target.value)}
                  placeholder="e.g. total_amount_usd"
                />

                <Select
                  label="Aggregation Function"
                  value={aggregationFunc}
                  onChange={(e) => setAggregationFunc(e.target.value as any)}
                >
                  <option value="sum">SUM (Total gross)</option>
                  <option value="avg">AVG (Average)</option>
                  <option value="count">COUNT (Volume)</option>
                  <option value="min">MIN (Minimum)</option>
                  <option value="max">MAX (Maximum)</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Time Partition Window"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value as any)}
                >
                  <option value="hourly">Hourly Grain</option>
                  <option value="daily">Daily Close</option>
                  <option value="weekly">Weekly Rollup</option>
                  <option value="monthly">Monthly Audit</option>
                </Select>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Overwrite Existing Partition Table</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  isLoading={goldMutation.isPending}
                  onClick={() => goldMutation.mutate()}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Build Gold Layer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gold Result */}
          <Card>
            <CardHeader>
              <CardTitle>Gold Build Result</CardTitle>
            </CardHeader>
            <CardContent>
              {goldResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Status: {goldResult.status.toUpperCase()}
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Successfully materialized table: {goldResult.target_table}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rows Aggregated</span>
                      <p className="text-base font-bold text-slate-900">{goldResult.rows_aggregated.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Execution Time</span>
                      <p className="text-base font-bold text-slate-900">{goldResult.execution_time_sec}s</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    Completed at: {new Date(goldResult.completed_at).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Configure aggregation settings to build business-ready Gold tables.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
