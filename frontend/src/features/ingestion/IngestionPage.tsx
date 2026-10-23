import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ingestionApi } from '../../services/api/ingestionApi';
import { datasetsApi } from '../../services/api/datasetsApi';
import { IngestionRequest, IngestionResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Clock,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';

export const IngestionPage: React.FC = () => {
  const { addToast } = useConfig();
  const { data: datasetsData } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const [datasetName, setDatasetName] = useState('ecommerce_orders');
  const [datasetType, setDatasetType] = useState('transactions');
  const [sourceType, setSourceType] = useState<'s3' | 'postgresql' | 'kafka' | 'csv_upload' | 'snowflake'>('s3');
  const [filePath, setFilePath] = useState('s3://datasentinel-lake/bronze/orders_stream/2026-10-22.parquet');
  const [batchSize, setBatchSize] = useState('5000');
  const [schemaValidation, setSchemaValidation] = useState(true);
  const [samplePayload, setSamplePayload] = useState(`[
  {
    "order_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "customer_id": "3a7d4bad-9bdd-2b0d-9b1d-eb4d3b7dcb6d",
    "order_timestamp": "2026-10-22T14:15:00Z",
    "total_amount_usd": 128.50,
    "payment_status": "settled"
  }
]`);

  const [recentIngestions, setRecentIngestions] = useState<IngestionResponse[]>([
    {
      job_id: 'job-ingest-8891',
      status: 'success',
      dataset_name: 'ecommerce_orders',
      records_ingested: 25400,
      duration_ms: 680,
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      job_id: 'job-ingest-8890',
      status: 'success',
      dataset_name: 'telemetry_device_logs',
      records_ingested: 120500,
      duration_ms: 1240,
      timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    },
  ]);

  const [lastResult, setLastResult] = useState<IngestionResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: IngestionRequest) => {
      const res = await ingestionApi.submitIngestion(payload);
      return res.data;
    },
    onSuccess: (result) => {
      setLastResult(result);
      setRecentIngestions((prev) => [result, ...prev]);
      addToast({
        type: 'success',
        title: 'Ingestion Job Submitted Successfully',
        message: `Job ${result.job_id} processed ${result.records_ingested.toLocaleString()} records in ${result.duration_ms}ms.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Ingestion Submission Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let records: Record<string, unknown>[] | undefined;

    if (sourceType === 'csv_upload' && samplePayload.trim()) {
      try {
        records = JSON.parse(samplePayload);
      } catch {
        addToast({
          type: 'error',
          title: 'JSON Parse Error',
          message: 'Malformed JSON provided in records payload.',
        });
        return;
      }
    }

    const payload: IngestionRequest = {
      dataset_name: datasetName,
      dataset_type: datasetType,
      source_type: sourceType,
      file_path: filePath || undefined,
      records,
      options: {
        batch_size: parseInt(batchSize, 10) || 5000,
        schema_validation: schemaValidation,
        quarantine_malformed: true,
      },
    };

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Ingestion</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit data ingestion jobs to stream or batch ingest raw data into Bronze delta layers (POST /ingestion/dataset)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingestion Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submit Ingestion Job</CardTitle>
            <p className="text-xs text-slate-500">Configures source connector and validation rules</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Target Dataset"
                  value={datasetName}
                  onChange={(e) => {
                    setDatasetName(e.target.value);
                    const found = datasetsData?.data.find((d) => d.name === e.target.value);
                    if (found) setDatasetType(found.dataset_type);
                  }}
                >
                  {(datasetsData?.data || []).map((ds) => (
                    <option key={ds.name} value={ds.name}>
                      {ds.name} ({ds.layer})
                    </option>
                  ))}
                </Select>

                <Input
                  label="Dataset Type / Domain"
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  placeholder="e.g. transactions, iot_events"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Source Connector"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                >
                  <option value="s3">Amazon S3 (Delta / Parquet)</option>
                  <option value="postgresql">PostgreSQL Change Data Capture (CDC)</option>
                  <option value="kafka">Apache Kafka Topic</option>
                  <option value="snowflake">Snowflake External Stage</option>
                  <option value="csv_upload">Direct JSON/CSV In-Memory Payload</option>
                </Select>

                <Input
                  label="Batch Size"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                />
              </div>

              {sourceType !== 'csv_upload' ? (
                <Input
                  label="Source Path / URI / Topic"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="s3://bucket/path/to/data.parquet"
                  hint="Specify Lakehouse object path, JDBC connection string, or Kafka topic name"
                />
              ) : (
                <Textarea
                  label="Raw JSON Records Payload"
                  rows={4}
                  value={samplePayload}
                  onChange={(e) => setSamplePayload(e.target.value)}
                  className="font-mono text-xs"
                  hint="Array of JSON objects conforming to dataset schema"
                />
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-800">Enforce Bronze Schema Contract</h5>
                  <p className="text-[11px] text-slate-500">
                    Automatically reject or quarantine malformed records before persisting to delta lake
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={schemaValidation}
                  onChange={(e) => setSchemaValidation(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={mutation.isPending}
                  leftIcon={<UploadCloud className="w-4 h-4" />}
                >
                  Submit Ingestion Job
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Real-time Response Feedback */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {lastResult ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Job Completed: {lastResult.job_id}
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Successfully ingested into Bronze layer.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Records</span>
                      <p className="font-bold text-slate-900">{lastResult.records_ingested.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Duration</span>
                      <p className="font-bold text-slate-900">{lastResult.duration_ms} ms</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span>Target: {lastResult.dataset_name}</span>
                    <span>{new Date(lastResult.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Fill out the parameters and click Submit to trigger an ingestion request.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ingestion Jobs History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ingestion Jobs</CardTitle>
          <p className="text-xs text-slate-500">History of data intake operations</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Job ID</th>
                <th className="px-5 py-3">Dataset Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Records Ingested</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentIngestions.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-slate-900">{job.job_id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{job.dataset_name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={job.status === 'success' ? 'healthy' : 'failing'} size="sm" dot>
                      {job.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {job.records_ingested.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">{job.duration_ms} ms</td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(job.timestamp).toLocaleString([], {
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
  );
};
