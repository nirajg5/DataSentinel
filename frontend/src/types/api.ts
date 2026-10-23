// DataSentinel Core TypeScript Schemas & Interfaces

export type UserRole = 'admin' | 'data_engineer' | 'analyst' | 'viewer';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user?: UserResponse;
}

export interface AdminTestResponse {
  status: string;
  message: string;
  user_role: string;
  timestamp: string;
}

export interface DatasetColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface DatasetSummary {
  name: string;
  dataset_type: string;
  layer: 'bronze' | 'silver' | 'gold';
  row_count: number;
  column_count: number;
  size_bytes?: number;
  last_updated: string;
  status: 'healthy' | 'degraded' | 'failing' | 'idle';
  quality_score?: number;
  columns?: DatasetColumn[];
  description?: string;
}

export interface IngestionRequest {
  dataset_name: string;
  dataset_type: string;
  source_type: 's3' | 'postgresql' | 'kafka' | 'csv_upload' | 'snowflake';
  file_path?: string;
  records?: Record<string, unknown>[];
  options?: {
    batch_size?: number;
    schema_validation?: boolean;
    quarantine_malformed?: boolean;
  };
}

export interface IngestionResponse {
  job_id: string;
  status: 'success' | 'partial' | 'failed';
  dataset_name: string;
  records_ingested: number;
  duration_ms: number;
  timestamp: string;
  errors?: string[];
}

export interface SilverETLOptions {
  deduplicate?: boolean;
  drop_nulls?: boolean;
  validate_types?: boolean;
  custom_filter?: string;
}

export interface ETLResultResponse {
  status: 'success' | 'failed' | 'warning';
  layer: 'silver';
  dataset_type: string;
  rows_in: number;
  rows_out: number;
  dropped_rows: number;
  execution_time_sec: number;
  timestamp: string;
  details?: string;
}

export interface GoldBuildRequest {
  target_table: string;
  aggregations: Array<{
    column: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias: string;
  }>;
  time_window?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  overwrite?: boolean;
}

export interface GoldBuildResponse {
  status: 'success' | 'failed';
  target_table: string;
  rows_aggregated: number;
  execution_time_sec: number;
  completed_at: string;
  metrics?: Record<string, number>;
}

export interface QualityRuleCheck {
  rule_name: string;
  column_name?: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  observed_value?: string | number;
  threshold?: string | number;
  error_message?: string;
}

export interface QualityCheckOptions {
  rules?: string[];
  strict_mode?: boolean;
}

export interface QualityCheckResult {
  dataset_type: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks?: number;
  pass_rate: number;
  status: 'passed' | 'failed' | 'warning';
  timestamp: string;
  checks: QualityRuleCheck[];
}

export interface FreshnessCheckRequest {
  sla_minutes_threshold?: number;
}

export interface FreshnessResult {
  dataset_name: string;
  last_updated: string;
  sla_threshold_min: number;
  age_minutes: number;
  is_fresh: boolean;
  status: 'fresh' | 'stale' | 'critical';
  checked_at: string;
  sla_variance_min?: number;
}

export interface ReliabilityCalculationRequest {
  window_days?: number;
}

export interface ReliabilityScoreResponse {
  dataset_type: string;
  score: number; // 0 - 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  uptime_percentage: number;
  failure_frequency: number;
  mttr_minutes: number;
  data_loss_percentage: number;
  calculation_window_days: number;
  historical_scores?: Array<{ date: string; score: number }>;
}

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface IncidentItem {
  incident_code: string;
  dataset_name: string;
  pipeline_id?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detected_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  anomaly_metric?: string;
  root_cause?: string;
}

export interface IncidentDetectRequest {
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface IncidentDetectResponse {
  dataset_name: string;
  incidents_detected: number;
  incident_codes: string[];
  scan_duration_ms: number;
}

export interface PipelineFailureDetectResponse {
  dataset_name: string;
  new_failures_flagged: number;
  incidents: IncidentItem[];
}

export interface ResolveIncidentRequest {
  resolution_notes: string;
}

export interface AIAnalysisResponse {
  incident_code: string;
  root_cause_hypothesis: string;
  confidence_score: number; // 0 - 1.0
  impact_scope: string;
  suggested_mitigation: string;
  logs_analyzed: number;
  affected_downstream: string[];
  failure_timeline?: Array<{ timestamp: string; event: string }>;
  suggested_query_fix?: string;
}

export interface DemoAnalysisRequest {
  scenario?: 'schema_drift' | 'null_surge' | 'pipeline_timeout' | 'upstream_outage';
}

export interface SourceCitation {
  title: string;
  doc_id: string;
  snippet: string;
  score: number;
  source_type: 'playbook' | 'doc' | 'incident_history' | 'schema_spec';
}

export interface RAGQueryRequest {
  question: string;
  top_k?: number;
  filter_category?: string;
}

export interface RAGQueryResponse {
  question: string;
  answer: string;
  citations: SourceCitation[];
  search_latency_ms: number;
  model_used: string;
}

export interface AgentInvestigateRequest {
  dataset_name: string;
  incident_code?: string;
  query: string;
  max_iterations?: number;
}

export interface AgentStep {
  step_number: number;
  agent_role: string;
  action: string;
  reasoning: string;
  output: string;
  duration_ms: number;
}

export interface AgentInvestigationResult {
  investigation_id: string;
  dataset_name: string;
  incident_code?: string;
  status: 'completed' | 'failed';
  root_cause: string;
  mitigation_steps: string[];
  confidence: number;
  steps_taken: AgentStep[];
  total_duration_sec: number;
  completed_at: string;
}

export interface AsyncTaskResponse {
  task_id: string;
  status: 'queued' | 'running';
  message: string;
  created_at: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number; // 0-100
  current_step?: string;
  result?: AgentInvestigationResult;
  error?: string;
  updated_at?: string;
}

export interface AgentInvestigationSummary {
  id: string;
  task_id: string;
  dataset_name: string;
  query: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  duration_sec: number;
  created_at: string;
}

export interface RecoverStaleRequest {
  older_than_minutes?: number;
}

export interface RecoverStaleResponse {
  tasks_inspected: number;
  tasks_recovered: number;
  message: string;
  timestamp: string;
}

export interface AgentMetricsResponse {
  total_investigations: number;
  avg_duration_sec: number;
  success_rate: number;
  tokens_consumed: number;
  active_agents: number;
  agent_types: Array<{ role: string; executions: number; avg_time_sec: number }>;
}

export interface ModelStatusResponse {
  model_name: string;
  version: string;
  status: 'active' | 'training' | 'stale' | 'offline';
  trained_at: string;
  algorithm: string;
  feature_count: number;
  dataset_coverage: number;
}

export interface RiskFactor {
  factor: string;
  importance: number;
  description: string;
}

export interface PredictionResultResponse {
  dataset_name: string;
  failure_probability: number; // 0.0 - 1.0
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  key_risk_factors: RiskFactor[];
  suggested_prevention?: string;
  timestamp: string;
}

export interface PredictionHistoryItem {
  id: string;
  timestamp: string;
  dataset_name: string;
  failure_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actual_outcome?: 'success' | 'failure' | 'in_progress';
}

export interface ModelEvaluationResponse {
  roc_auc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: {
    true_positive: number;
    false_positive: number;
    true_negative: number;
    false_negative: number;
  };
  feature_importances: Array<{ feature: string; importance: number }>;
}

export type PipelineStatus = 'success' | 'failed' | 'running' | 'queued' | 'cancelled';

export interface PipelineStep {
  step_name: string;
  status: PipelineStatus;
  started_at: string;
  completed_at?: string;
  duration_sec?: number;
  records_processed?: number;
  error?: string;
}

export interface PipelineRunItem {
  run_id: string;
  pipeline_name: string;
  dataset_name: string;
  status: PipelineStatus;
  started_at: string;
  completed_at?: string;
  duration_sec?: number;
  records_processed?: number;
  error_message?: string;
}

export interface PipelineSummaryResponse {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  running_runs: number;
  pass_rate: number;
  avg_duration_sec: number;
}

export interface PipelineRunDetail extends PipelineRunItem {
  steps: PipelineStep[];
  logs: string;
  metrics: {
    cpu_usage_pct: number;
    memory_mb: number;
    io_throughput_mb_s: number;
  };
}

export interface RootResponse {
  app_name: string;
  version: string;
  status: string;
  docs_url: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_sec: number;
  version?: string;
}

export interface DatabaseHealthResponse {
  status: 'connected' | 'disconnected';
  latency_ms: number;
  pool_size?: number;
  active_connections?: number;
  error?: string;
}

export interface PrometheusMetricItem {
  name: string;
  type: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}
