import {
  UserResponse,
  DatasetSummary,
  QualityCheckResult,
  FreshnessResult,
  ReliabilityScoreResponse,
  IncidentItem,
  AIAnalysisResponse,
  RAGQueryResponse,
  AgentInvestigationResult,
  AgentInvestigationSummary,
  AgentMetricsResponse,
  ModelStatusResponse,
  PredictionResultResponse,
  PredictionHistoryItem,
  ModelEvaluationResponse,
  PipelineRunItem,
  PipelineSummaryResponse,
  PipelineRunDetail,
  RootResponse,
  HealthResponse,
  DatabaseHealthResponse
} from '../types/api';

export const MOCK_USERS: Record<string, UserResponse> = {
  admin: {
    id: 'usr-admin-001',
    username: 'admin',
    email: 'admin@datasentinel.io',
    full_name: 'Elena Rostova (Lead Data Architect)',
    role: 'admin',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
  },
  data_engineer: {
    id: 'usr-eng-002',
    username: 'dev_alex',
    email: 'alex.chen@datasentinel.io',
    full_name: 'Alex Chen (Staff Data Engineer)',
    role: 'data_engineer',
    is_active: true,
    created_at: '2026-03-22T10:15:00Z',
  },
  analyst: {
    id: 'usr-ana-003',
    username: 'sarah_bi',
    email: 'sarah.miller@datasentinel.io',
    full_name: 'Sarah Miller (Senior Analytics Engineer)',
    role: 'analyst',
    is_active: true,
    created_at: '2026-05-10T14:30:00Z',
  },
};

export const MOCK_DATASETS: DatasetSummary[] = [
  {
    name: 'ecommerce_orders',
    dataset_type: 'transactions',
    layer: 'silver',
    row_count: 14258900,
    column_count: 24,
    size_bytes: 4892019200,
    last_updated: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    status: 'healthy',
    quality_score: 98.4,
    description: 'De-duplicated and enriched order event stream with line items, tax, and settlement status.',
    columns: [
      { name: 'order_id', type: 'UUID', nullable: false, description: 'Primary order identifier' },
      { name: 'customer_id', type: 'UUID', nullable: false, description: 'Foreign key to customer' },
      { name: 'order_timestamp', type: 'TIMESTAMP', nullable: false, description: 'UTC checkout instant' },
      { name: 'total_amount_usd', type: 'DECIMAL(12,2)', nullable: false, description: 'Order gross sum' },
      { name: 'payment_status', type: 'VARCHAR(32)', nullable: false, description: 'settled, pending, or failed' },
      { name: 'shipping_country', type: 'VARCHAR(2)', nullable: true, description: 'ISO-2 country code' },
    ],
  },
  {
    name: 'customer_churn_features',
    dataset_type: 'ml_features',
    layer: 'gold',
    row_count: 2140500,
    column_count: 48,
    size_bytes: 1240900000,
    last_updated: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    status: 'degraded',
    quality_score: 87.1,
    description: 'Feature store table for downstream churn and lifetime value prediction models.',
    columns: [
      { name: 'customer_id', type: 'UUID', nullable: false, description: 'Customer identifier' },
      { name: 'days_since_last_login', type: 'INT', nullable: false, description: 'Inactivity delta' },
      { name: 'net_spend_90d', type: 'DECIMAL(10,2)', nullable: false, description: 'Rolling spend' },
      { name: 'support_tickets_30d', type: 'INT', nullable: true, description: 'Escalations count' },
      { name: 'feature_timestamp', type: 'TIMESTAMP', nullable: false, description: 'Partition window timestamp' },
    ],
  },
  {
    name: 'telemetry_device_logs',
    dataset_type: 'iot_events',
    layer: 'bronze',
    row_count: 98450120,
    column_count: 18,
    size_bytes: 38910400000,
    last_updated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    status: 'healthy',
    quality_score: 99.1,
    description: 'Raw edge-sensor heartbeat and diagnostic telemetry streams from IoT gateway clusters.',
    columns: [
      { name: 'device_id', type: 'VARCHAR(64)', nullable: false, description: 'Hardware serial hash' },
      { name: 'firmware_version', type: 'VARCHAR(16)', nullable: false, description: 'SemVer release' },
      { name: 'cpu_temp_celsius', type: 'FLOAT', nullable: true, description: 'Thermal sensor reading' },
      { name: 'packet_drop_rate', type: 'FLOAT', nullable: false, description: 'Network loss ratio' },
    ],
  },
  {
    name: 'financial_ledger_entries',
    dataset_type: 'accounting',
    layer: 'gold',
    row_count: 8945200,
    column_count: 32,
    size_bytes: 2840000000,
    last_updated: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    status: 'failing',
    quality_score: 72.3,
    description: 'Double-entry audited general ledger aggregated for month-end close reporting.',
    columns: [
      { name: 'ledger_entry_id', type: 'UUID', nullable: false, description: 'Immutably sequenced record' },
      { name: 'account_code', type: 'VARCHAR(20)', nullable: false, description: 'Chart of accounts code' },
      { name: 'debit_amount', type: 'DECIMAL(14,4)', nullable: false, description: 'Debit sum' },
      { name: 'credit_amount', type: 'DECIMAL(14,4)', nullable: false, description: 'Credit sum' },
      { name: 'reconciliation_status', type: 'VARCHAR(16)', nullable: false, description: 'Balanced or flag' },
    ],
  },
  {
    name: 'clickstream_web_events',
    dataset_type: 'behavioral',
    layer: 'silver',
    row_count: 45201000,
    column_count: 22,
    size_bytes: 14500000000,
    last_updated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'healthy',
    quality_score: 96.7,
    description: 'Client session event clickstream parsed with GeoIP and UTM attribution mapping.',
  },
];

export const MOCK_INCIDENTS: IncidentItem[] = [
  {
    incident_code: 'INC-2026-8942',
    dataset_name: 'financial_ledger_entries',
    pipeline_id: 'pipe-fin-gl-04',
    severity: 'critical',
    status: 'open',
    title: 'Unbalanced Journal Entries & Missing Foreign Keys',
    description: 'ETL load step detected 3,412 rows with NULL account_codes and unbalanced debits exceeding $142,000 variance.',
    detected_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    anomaly_metric: 'Debit/Credit Variance > 0.0001 (Observed: $142,850.21)',
    root_cause: 'Upstream microservice payload upgrade omitted ledger chart UUID during checkout serialization.',
  },
  {
    incident_code: 'INC-2026-8919',
    dataset_name: 'customer_churn_features',
    pipeline_id: 'pipe-ml-features-hourly',
    severity: 'high',
    status: 'investigating',
    title: 'Severe Distribution Shift in net_spend_90d',
    description: 'Kolmogorov-Smirnov test triggered: p-value 0.00002 below 0.05 threshold. Negative spend values detected.',
    detected_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    anomaly_metric: 'KS-Statistic Drift Score: 0.68 (Limit: 0.20)',
    root_cause: 'Refund aggregation joined without currency normalizer, resulting in reversed signs.',
  },
  {
    incident_code: 'INC-2026-8871',
    dataset_name: 'ecommerce_orders',
    pipeline_id: 'pipe-orders-silver',
    severity: 'medium',
    status: 'resolved',
    title: 'Duplicate Order Keys in Bronze Ingestion Buffer',
    description: 'Webhook retry burst created 1,120 duplicate order IDs within a 90-second window.',
    detected_at: new Date(Date.now() - 540 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    resolution_notes: 'Silver layer deduplication idempotency window increased from 10 minutes to 60 minutes.',
    anomaly_metric: 'Duplicate Key Ratio: 1.4% (Threshold: 0.0%)',
    root_cause: 'Idempotency key generation was using client timestamp instead of gateway request ID.',
  },
  {
    incident_code: 'INC-2026-8804',
    dataset_name: 'telemetry_device_logs',
    pipeline_id: 'pipe-iot-stream-sink',
    severity: 'low',
    status: 'resolved',
    title: 'Minor Schema Drift on Firmware Header',
    description: 'New v4.12 edge nodes transmitted extra field `battery_health_cycles` unrecognized by strict schema.',
    detected_at: new Date(Date.now() - 1200 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 1100 * 60 * 1000).toISOString(),
    resolution_notes: 'Updated Bronze Avro schema to include optional integer field battery_health_cycles.',
    anomaly_metric: 'Unrecognized Schema Attributes: 1',
    root_cause: 'Edge deployment completed before central schema registry sync.',
  },
];

export const MOCK_PIPELINE_RUNS: PipelineRunItem[] = [
  {
    run_id: 'run-882910-gl',
    pipeline_name: 'financial_ledger_etl',
    dataset_name: 'financial_ledger_entries',
    status: 'failed',
    started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    duration_sec: 124,
    records_processed: 84000,
    error_message: 'AssertionError: Quality Check Failed: Debit/Credit Balance constraint violated for 3,412 rows.',
  },
  {
    run_id: 'run-882909-ord',
    pipeline_name: 'ecommerce_orders_hourly',
    dataset_name: 'ecommerce_orders',
    status: 'success',
    started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 39 * 60 * 1000).toISOString(),
    duration_sec: 362,
    records_processed: 512900,
  },
  {
    run_id: 'run-882908-feat',
    pipeline_name: 'churn_feature_computation',
    dataset_name: 'customer_churn_features',
    status: 'running',
    started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    duration_sec: 480,
    records_processed: 1200000,
  },
  {
    run_id: 'run-882907-iot',
    pipeline_name: 'iot_telemetry_bronze_sink',
    dataset_name: 'telemetry_device_logs',
    status: 'success',
    started_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
    duration_sec: 240,
    records_processed: 4200000,
  },
  {
    run_id: 'run-882906-click',
    pipeline_name: 'clickstream_sessionizer',
    dataset_name: 'clickstream_web_events',
    status: 'success',
    started_at: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 79 * 60 * 1000).toISOString(),
    duration_sec: 350,
    records_processed: 2800000,
  },
  {
    run_id: 'run-882905-gold',
    pipeline_name: 'gold_business_marts_build',
    dataset_name: 'ecommerce_orders',
    status: 'success',
    started_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 128 * 60 * 1000).toISOString(),
    duration_sec: 720,
    records_processed: 14258900,
  },
];

export const MOCK_PIPELINE_SUMMARY: PipelineSummaryResponse = {
  total_runs: 148,
  successful_runs: 139,
  failed_runs: 7,
  running_runs: 2,
  pass_rate: 93.9,
  avg_duration_sec: 345,
};

export const MOCK_PIPELINE_RUN_DETAIL: PipelineRunDetail = {
  run_id: 'run-882910-gl',
  pipeline_name: 'financial_ledger_etl',
  dataset_name: 'financial_ledger_entries',
  status: 'failed',
  started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  duration_sec: 124,
  records_processed: 84000,
  error_message: 'AssertionError: Quality Check Failed: Debit/Credit Balance constraint violated for 3,412 rows.',
  steps: [
    {
      step_name: 'Extract Bronze Delta Logs',
      status: 'success',
      started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 31.7 * 60 * 1000).toISOString(),
      duration_sec: 18,
      records_processed: 84000,
    },
    {
      step_name: 'Schema Validation & Coercion',
      status: 'success',
      started_at: new Date(Date.now() - 31.7 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 31.2 * 60 * 1000).toISOString(),
      duration_sec: 30,
      records_processed: 84000,
    },
    {
      step_name: 'Ledger Balancing Rule Suite',
      status: 'failed',
      started_at: new Date(Date.now() - 31.2 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      duration_sec: 76,
      records_processed: 84000,
      error: 'Debit/Credit sum deviation of $142,850.21 exceeded strict tolerance threshold ($0.00).',
    },
    {
      step_name: 'Gold Mart Materialization',
      status: 'cancelled',
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      records_processed: 0,
    },
  ],
  logs: `[2026-10-22 14:02:11] INFO [pipeline.executor] Initiating execution run_882910_gl on cluster-spark-prod-02
[2026-10-22 14:02:14] INFO [stage.extract] Loading delta table s3://datasentinel-lake/bronze/ledger/part-*
[2026-10-22 14:02:29] INFO [stage.extract] Read 84,000 raw parquet records in 18.2s
[2026-10-22 14:02:30] INFO [stage.validation] Enforcing schema v2.4 (strict type checking enabled)
[2026-10-22 14:03:00] INFO [stage.rules] Running Great Expectations checkpoint: financial_general_ledger_audit
[2026-10-22 14:03:22] WARN [rules.expect_column_values_to_not_be_null] Found 142 null entries in optional notes column
[2026-10-22 14:04:15] ERROR [rules.expect_table_debit_credit_to_balance] FAIL! Total debits: $4,912,410.12, Total credits: $4,769,559.91
[2026-10-22 14:04:15] ERROR [pipeline.executor] Pipeline failed at step 'Ledger Balancing Rule Suite'. Raising DataQualityError.`,
  metrics: {
    cpu_usage_pct: 78.4,
    memory_mb: 4096,
    io_throughput_mb_s: 142.5,
  },
};

export const MOCK_QUALITY_RESULT: Record<string, QualityCheckResult> = {
  ecommerce_orders: {
    dataset_type: 'ecommerce_orders',
    total_checks: 12,
    passed_checks: 12,
    failed_checks: 0,
    warning_checks: 0,
    pass_rate: 100.0,
    status: 'passed',
    timestamp: new Date().toISOString(),
    checks: [
      { rule_name: 'expect_column_to_exist: order_id', column_name: 'order_id', status: 'passed', description: 'Primary key must be present in schema' },
      { rule_name: 'expect_column_values_to_be_unique', column_name: 'order_id', status: 'passed', description: 'Order ID uniqueness across table' },
      { rule_name: 'expect_column_values_to_not_be_null', column_name: 'customer_id', status: 'passed', description: 'Zero null customer IDs' },
      { rule_name: 'expect_column_values_to_be_between', column_name: 'total_amount_usd', status: 'passed', observed_value: '$0.01 - $24,900.00', threshold: '$0.01 - $50,000.00', description: 'Valid order amount range' },
      { rule_name: 'expect_column_values_to_be_in_set', column_name: 'payment_status', status: 'passed', observed_value: 'settled, pending, failed', description: 'Only allowed status enums' },
    ],
  },
  financial_ledger_entries: {
    dataset_type: 'financial_ledger_entries',
    total_checks: 10,
    passed_checks: 7,
    failed_checks: 2,
    warning_checks: 1,
    pass_rate: 70.0,
    status: 'failed',
    timestamp: new Date().toISOString(),
    checks: [
      { rule_name: 'expect_table_debit_credit_to_balance', status: 'failed', observed_value: 'Variance: $142,850.21', threshold: '$0.00', error_message: 'Credits and Debits do not balance across journal batch', description: 'General ledger fundamental balance law' },
      { rule_name: 'expect_column_values_to_not_be_null', column_name: 'account_code', status: 'failed', observed_value: '3,412 nulls (4.06%)', threshold: '0.00%', error_message: 'Unassigned account codes detected', description: 'Every ledger record must map to valid chart code' },
      { rule_name: 'expect_column_values_to_be_unique', column_name: 'ledger_entry_id', status: 'passed', description: 'Unique ledger row IDs' },
      { rule_name: 'expect_column_values_to_be_recent', column_name: 'entry_timestamp', status: 'warning', observed_value: 'Lag: 190m', threshold: '60m', description: 'Ledger batch ingestion latency' },
    ],
  },
};

export const MOCK_FRESHNESS_RESULT: Record<string, FreshnessResult> = {
  ecommerce_orders: {
    dataset_name: 'ecommerce_orders',
    last_updated: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    sla_threshold_min: 60,
    age_minutes: 14,
    is_fresh: true,
    status: 'fresh',
    checked_at: new Date().toISOString(),
    sla_variance_min: -46,
  },
  financial_ledger_entries: {
    dataset_name: 'financial_ledger_entries',
    last_updated: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    sla_threshold_min: 60,
    age_minutes: 190,
    is_fresh: false,
    status: 'critical',
    checked_at: new Date().toISOString(),
    sla_variance_min: 130,
  },
  customer_churn_features: {
    dataset_name: 'customer_churn_features',
    last_updated: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    sla_threshold_min: 60,
    age_minutes: 48,
    is_fresh: true,
    status: 'fresh',
    checked_at: new Date().toISOString(),
    sla_variance_min: -12,
  },
};

export const MOCK_RELIABILITY_SCORES: Record<string, ReliabilityScoreResponse> = {
  ecommerce_orders: {
    dataset_type: 'ecommerce_orders',
    score: 98.4,
    grade: 'A',
    uptime_percentage: 99.82,
    failure_frequency: 0.02,
    mttr_minutes: 18.5,
    data_loss_percentage: 0.00,
    calculation_window_days: 30,
    historical_scores: [
      { date: '2026-10-16', score: 99.0 },
      { date: '2026-10-17', score: 98.8 },
      { date: '2026-10-18', score: 98.5 },
      { date: '2026-10-19', score: 99.2 },
      { date: '2026-10-20', score: 98.4 },
      { date: '2026-10-21', score: 97.9 },
      { date: '2026-10-22', score: 98.4 },
    ],
  },
  financial_ledger_entries: {
    dataset_type: 'financial_ledger_entries',
    score: 72.3,
    grade: 'C',
    uptime_percentage: 91.4,
    failure_frequency: 0.18,
    mttr_minutes: 142.0,
    data_loss_percentage: 0.08,
    calculation_window_days: 30,
    historical_scores: [
      { date: '2026-10-16', score: 94.0 },
      { date: '2026-10-17', score: 92.5 },
      { date: '2026-10-18', score: 88.0 },
      { date: '2026-10-19', score: 85.0 },
      { date: '2026-10-20', score: 80.2 },
      { date: '2026-10-21', score: 76.5 },
      { date: '2026-10-22', score: 72.3 },
    ],
  },
};

export const MOCK_AI_ANALYSIS: Record<string, AIAnalysisResponse> = {
  'INC-2026-8942': {
    incident_code: 'INC-2026-8942',
    root_cause_hypothesis: 'Schema contract regression in checkout microservice v3.4.1 deployment omitted required account_code foreign key on refund ledger splits, resulting in unbalanced double-entry accounting records.',
    confidence_score: 0.94,
    impact_scope: '3,412 journal transactions ($142,850.21 variance). Downstream daily revenue reconcile mart is blocked.',
    suggested_mitigation: '1. Revert microservice payload to v3.4.0 or patch null account_code fallback. 2. Run quarantine remediation pipeline to backfill missing chart IDs using checkout receipt headers.',
    logs_analyzed: 4210,
    affected_downstream: [
      'finance_gold.daily_ebitda_mart',
      'reporting.sox_compliance_audit_ledger',
      'bi.executive_cash_flow_dashboard',
    ],
    failure_timeline: [
      { timestamp: '2026-10-22 13:45:00 UTC', event: 'Microservice checkout-svc deployed commit 8f921a' },
      { timestamp: '2026-10-22 13:58:20 UTC', event: 'First batch of refund events arrived with null account_code' },
      { timestamp: '2026-10-22 14:02:11 UTC', event: 'financial_ledger_etl scheduled run triggered' },
      { timestamp: '2026-10-22 14:04:15 UTC', event: 'Expectation debit_credit_to_balance threw critical assertion' },
    ],
    suggested_query_fix: `UPDATE bronze.financial_ledger_entries 
SET account_code = 'AC-REFUND-DEFAULT'
WHERE account_code IS NULL AND transaction_type = 'REFUND';`,
  },
};

export const MOCK_RAG_RESPONSES: Record<string, RAGQueryResponse> = {
  default: {
    question: 'How do I resolve schema drift and unbalanced journal entries in financial_ledger_entries?',
    answer: 'According to the DataSentinel Financial Pipeline Playbook (FIN-SOP-04), unbalanced ledger errors occur when debit and credit sums diverge beyond $0.00. The standard operating procedure is:\n\n1. Quarantine erroneous records into `quarantine.financial_ledger_entries_unbalanced`.\n2. Verify upstream Kafka topic `fin.orders.checkout.v1` for missing schema fields.\n3. Execute the idempotency reconciliation script: `POST /etl/silver/financial_ledger_entries` with `{ deduplicate: true, validate_types: true }`.\n4. Re-run `/quality/check/financial_ledger_entries` to confirm pass rate returns to 100%.',
    citations: [
      {
        title: 'Financial Pipeline Runbook: Journal Balancing & SOX Controls',
        doc_id: 'PLAYBOOK-FIN-04',
        snippet: 'Strict zero-tolerance balancing rules are applied at Bronze-to-Silver transition. Any deviation exceeding $0.00 raises an immediate P1 incident.',
        score: 0.96,
        source_type: 'playbook',
      },
      {
        title: 'Data Reliability Architecture & Schema Contract Guide',
        doc_id: 'DOC-ARCH-12',
        snippet: 'When microservices introduce optional attributes, Silver ETL layers must specify explicit default coalesce policies to avoid downstream NaN / NULL propagation.',
        score: 0.89,
        source_type: 'doc',
      },
    ],
    search_latency_ms: 184,
    model_used: 'llama-3.3-70b-versatile via Groq + Pinecone Index: datasentinel-knowledge',
  },
};

export const MOCK_AGENT_RESULT: AgentInvestigationResult = {
  investigation_id: 'inv-langgraph-88910',
  dataset_name: 'financial_ledger_entries',
  incident_code: 'INC-2026-8942',
  status: 'completed',
  root_cause: 'Ingestion schema drift introduced null account_code values on 3,412 rows following upstream service update, causing debit/credit reconciliation mismatch.',
  mitigation_steps: [
    'Quarantine malformed records to table quarantine_ledger_20261022',
    'Apply default foreign key mapping `AC-REFUND-DEFAULT` for null categories',
    'Re-trigger Silver ETL with strict validation enabled',
    'Notify platform on-call to deploy upstream validation patch in checkout-svc',
  ],
  confidence: 0.95,
  steps_taken: [
    {
      step_number: 1,
      agent_role: 'Telemetry Inspector',
      action: 'Query Prometheus & OpenTelemetry trace spans for pipeline `financial_ledger_etl`',
      reasoning: 'Need to isolate whether the failure was network latency, timeout, or business rule assertion.',
      output: 'Found exit code 1 with traceback: AssertionError: debit/credit balance constraint failed.',
      duration_ms: 840,
    },
    {
      step_number: 2,
      agent_role: 'Data Quality Auditor',
      action: 'Inspect Great Expectations validation results on Bronze table partition',
      reasoning: 'Examine which exact rows and columns triggered the violation.',
      output: 'Identified 3,412 records with account_code = NULL originating from checkout-svc v3.4.1.',
      duration_ms: 1250,
    },
    {
      step_number: 3,
      agent_role: 'Knowledge RAG Synthesizer',
      action: 'Retrieve playbook FIN-SOP-04 from Pinecone index',
      reasoning: 'Lookup documented standard recovery protocol for SOX compliance ledger errors.',
      output: 'Retrieved quarantine & backfill playbook with confidence 0.96.',
      duration_ms: 610,
    },
    {
      step_number: 4,
      agent_role: 'Root Cause & Remediation Planner',
      action: 'Generate concrete remediation steps and SQL repair statements',
      reasoning: 'Synthesize audit logs and playbook recommendations into actionable steps.',
      output: 'Generated 4-step remediation plan with verified SQL mitigation script.',
      duration_ms: 920,
    },
  ],
  total_duration_sec: 3.62,
  completed_at: new Date().toISOString(),
};

export const MOCK_AGENT_HISTORY: AgentInvestigationSummary[] = [
  {
    id: 'inv-hist-01',
    task_id: 'task-celery-8921',
    dataset_name: 'financial_ledger_entries',
    query: 'Investigate debit/credit imbalance in general ledger batch #4401',
    status: 'completed',
    duration_sec: 4.2,
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-hist-02',
    task_id: 'task-celery-8904',
    dataset_name: 'customer_churn_features',
    query: 'Analyze Kolmogorov-Smirnov distribution shift on net_spend_90d',
    status: 'completed',
    duration_sec: 6.8,
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-hist-03',
    task_id: 'task-celery-8879',
    dataset_name: 'telemetry_device_logs',
    query: 'Investigate network packet drop surge across IoT edge zone EU-West-1',
    status: 'completed',
    duration_sec: 3.1,
    created_at: new Date(Date.now() - 340 * 60 * 1000).toISOString(),
  },
];

export const MOCK_AGENT_METRICS: AgentMetricsResponse = {
  total_investigations: 342,
  avg_duration_sec: 4.8,
  success_rate: 96.2,
  tokens_consumed: 1420800,
  active_agents: 4,
  agent_types: [
    { role: 'Telemetry Inspector', executions: 342, avg_time_sec: 1.1 },
    { role: 'Data Quality Auditor', executions: 310, avg_time_sec: 1.6 },
    { role: 'RAG Synthesizer', executions: 295, avg_time_sec: 0.9 },
    { role: 'Remediation Planner', executions: 342, avg_time_sec: 1.2 },
  ],
};

export const MOCK_MODEL_STATUS: ModelStatusResponse = {
  model_name: 'DataSentinel-FailurePredictor-XGBoost',
  version: 'v2.1.0-prod',
  status: 'active',
  trained_at: '2026-10-18T04:00:00Z',
  algorithm: 'XGBoostClassifier with Optuna Hyperparameter Tuning',
  feature_count: 36,
  dataset_coverage: 94.2,
};

export const MOCK_PREDICTION_RESULT: Record<string, PredictionResultResponse> = {
  financial_ledger_entries: {
    dataset_name: 'financial_ledger_entries',
    failure_probability: 0.88,
    risk_level: 'CRITICAL',
    key_risk_factors: [
      { factor: 'SLA Delay Variance (130m overdue)', importance: 0.42, description: 'Batch update frequency dropped significantly below standard 60-minute window.' },
      { factor: 'High Quality Check Failure Rate (30%)', importance: 0.31, description: 'Previous check failed 3 rules including mandatory balancing constraint.' },
      { factor: 'Upstream Code Commit Velocity', importance: 0.15, description: 'Upstream repository had 4 merge events within the last 2 hours.' },
    ],
    suggested_prevention: 'Hold automated Gold mart materialization until Silver reconciliation confirms debits/credits balance.',
    timestamp: new Date().toISOString(),
  },
  ecommerce_orders: {
    dataset_name: 'ecommerce_orders',
    failure_probability: 0.04,
    risk_level: 'LOW',
    key_risk_factors: [
      { factor: 'Low Row Count Volatility', importance: 0.12, description: 'Daily order volume matches 7-day moving average within 1.8% deviation.' },
    ],
    suggested_prevention: 'Pipeline is executing within optimal parameters. No action required.',
    timestamp: new Date().toISOString(),
  },
};

export const MOCK_PREDICTION_HISTORY: PredictionHistoryItem[] = [
  { id: 'pred-hist-01', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), dataset_name: 'financial_ledger_entries', failure_probability: 0.88, risk_level: 'CRITICAL', actual_outcome: 'failure' },
  { id: 'pred-hist-02', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), dataset_name: 'ecommerce_orders', failure_probability: 0.04, risk_level: 'LOW', actual_outcome: 'success' },
  { id: 'pred-hist-03', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), dataset_name: 'customer_churn_features', failure_probability: 0.62, risk_level: 'HIGH', actual_outcome: 'failure' },
  { id: 'pred-hist-04', timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), dataset_name: 'telemetry_device_logs', failure_probability: 0.11, risk_level: 'LOW', actual_outcome: 'success' },
];

export const MOCK_MODEL_EVALUATION: ModelEvaluationResponse = {
  roc_auc: 0.942,
  accuracy: 0.915,
  precision: 0.892,
  recall: 0.878,
  f1_score: 0.885,
  confusion_matrix: {
    true_positive: 312,
    false_positive: 38,
    true_negative: 840,
    false_negative: 43,
  },
  feature_importances: [
    { feature: 'freshness_lag_minutes', importance: 0.28 },
    { feature: 'prior_quality_failure_count', importance: 0.22 },
    { feature: 'row_count_pct_change_24h', importance: 0.16 },
    { feature: 'null_value_rate_drift', importance: 0.14 },
    { feature: 'pipeline_duration_zscore', importance: 0.11 },
    { feature: 'upstream_dependency_failures', importance: 0.09 },
  ],
};

export const MOCK_ROOT_INFO: RootResponse = {
  app_name: 'DataSentinel Enterprise Core API',
  version: '2.4.0',
  status: 'operational',
  docs_url: 'http://localhost:8000/docs',
};

export const MOCK_HEALTH: HealthResponse = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime_sec: 421890,
  version: '2.4.0',
};

export const MOCK_DB_HEALTH: DatabaseHealthResponse = {
  status: 'connected',
  latency_ms: 3.4,
  pool_size: 20,
  active_connections: 4,
};

export const MOCK_PROMETHEUS_RAW = `# HELP datasentinel_pipeline_runs_total Total number of pipeline executions
# TYPE datasentinel_pipeline_runs_total counter
datasentinel_pipeline_runs_total{status="success"} 139
datasentinel_pipeline_runs_total{status="failed"} 7
datasentinel_pipeline_runs_total{status="running"} 2

# HELP datasentinel_data_quality_checks_total Total data quality evaluations
# TYPE datasentinel_data_quality_checks_total counter
datasentinel_data_quality_checks_total{result="passed"} 948
datasentinel_data_quality_checks_total{result="failed"} 24

# HELP datasentinel_incident_active_gauge Current count of active open incidents
# TYPE datasentinel_incident_active_gauge gauge
datasentinel_incident_active_gauge{severity="critical"} 1
datasentinel_incident_active_gauge{severity="high"} 1
datasentinel_incident_active_gauge{severity="medium"} 0
datasentinel_incident_active_gauge{severity="low"} 0

# HELP datasentinel_agent_investigations_total LangGraph autonomous agent runs
# TYPE datasentinel_agent_investigations_total counter
datasentinel_agent_investigations_total{status="completed"} 342
datasentinel_agent_investigations_total{status="failed"} 13

# HELP datasentinel_db_connection_latency_seconds PostgreSQL roundtrip latency
# TYPE datasentinel_db_connection_latency_seconds gauge
datasentinel_db_connection_latency_seconds 0.0034
`;
