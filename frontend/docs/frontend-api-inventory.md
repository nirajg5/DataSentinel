# DataSentinel Frontend API Inventory

This document provides a comprehensive inventory of all 34 OpenAPI endpoints plus the Prometheus metrics endpoint from the DataSentinel FastAPI backend, their request/response schemas, authentication requirements, and their frontend integration status.

---

## 1. Authentication Domain (`backend/auth/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user | `UserRegisterRequest { username, email, password, full_name, role? }` | `UserResponse { id, username, email, role, is_active, created_at }` | None | **Integrated & Tested** |
| `POST` | `/auth/login` | Authenticate user & issue JWT | `OAuth2PasswordRequestForm` or `LoginRequest { username, password }` | `TokenResponse { access_token, token_type, expires_in, user }` | None | **Integrated & Tested** |
| `GET` | `/auth/me` | Fetch authenticated user profile | None | `UserResponse { id, username, email, full_name, role, is_active }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/auth/admin-test` | Verify administrative permissions | None | `AdminTestResponse { status, message, user_role, timestamp }` | Bearer Token (Role: Admin) | **Integrated & Tested** |

---

## 2. Datasets Domain (`backend/api/datasets.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/datasets/` | List all registered datasets | None | `List[DatasetSummary { name, dataset_type, row_count, last_updated, status, columns }]` | Optional / Bearer | **Integrated & Tested** |

---

## 3. Ingestion Domain (`backend/ingestion/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ingestion/dataset` | Submit dataset ingestion job | `IngestionRequest { dataset_name, dataset_type, source_type, file_path?, records?, options? }` | `IngestionResponse { job_id, status, dataset_name, records_ingested, duration_ms, timestamp }` | Bearer Token | **Integrated & Tested** |

---

## 4. ETL & Transformations Domain (`backend/etl/routes.py`, `backend/etl/gold_routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/etl/silver/{dataset_type}` | Execute Silver layer cleaning & validation | Path: `dataset_type: str`, Body: `SilverETLOptions { deduplicate?, drop_nulls?, validate_types? }` | `ETLResultResponse { status, layer: 'silver', dataset_type, rows_in, rows_out, dropped_rows, execution_time_sec }` | Bearer Token | **Integrated & Tested** |
| `POST` | `/etl/gold/build` | Aggregate & construct Gold business tables | `GoldBuildRequest { target_table, aggregations, time_window?, overwrite? }` | `GoldBuildResponse { status, target_table, rows_aggregated, execution_time_sec, completed_at }` | Bearer Token | **Integrated & Tested** |

---

## 5. Data Quality Domain (`backend/quality/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/quality/check/{dataset_type}` | Run suite of Great Expectations / custom quality rules | Path: `dataset_type: str`, Body: `QualityCheckOptions { rules?, strict_mode? }` | `QualityCheckResult { dataset_type, total_checks, passed_checks, failed_checks, pass_rate, checks: List[CheckDetail] }` | Bearer Token | **Integrated & Tested** |

---

## 6. Freshness Domain (`backend/freshness/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/freshness/check/{dataset_name}` | Check dataset update SLA & freshness delay | Path: `dataset_name: str`, Body: `FreshnessCheckRequest { sla_minutes_threshold? }` | `FreshnessResult { dataset_name, last_updated, sla_threshold_min, age_minutes, is_fresh, status }` | Bearer Token | **Integrated & Tested** |

---

## 7. Reliability Domain (`backend/reliability/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/reliability/calculate/{dataset_type}` | Calculate composite reliability index (DORA / SLA) | Path: `dataset_type: str`, Body: `ReliabilityCalculationRequest { window_days? }` | `ReliabilityScoreResponse { dataset_type, score, grade, uptime_percentage, failure_frequency, mttr_minutes }` | Bearer Token | **Integrated & Tested** |

---

## 8. Incident Management Domain (`backend/incidents/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/incidents/detect/{dataset_name}` | Trigger anomaly & incident detection for dataset | Path: `dataset_name: str`, Body: `IncidentDetectRequest { sensitivity? }` | `IncidentDetectResponse { dataset_name, incidents_detected, incident_codes }` | Bearer Token | **Integrated & Tested** |
| `POST` | `/incidents/detect-pipeline-failures/{dataset_name}` | Scan pipeline execution logs for failure incidents | Path: `dataset_name: str` | `PipelineFailureDetectResponse { dataset_name, new_failures_flagged, incidents }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/incidents/` | List all detected incidents | Query: `status?`, `severity?`, `dataset_name?` | `List[IncidentItem { incident_code, dataset_name, severity, status, title, description, detected_at, resolved_at? }]` | Bearer Token | **Integrated & Tested** |
| `PATCH` | `/incidents/{incident_code}/resolve` | Resolve an open incident | Path: `incident_code: str`, Body: `ResolveIncidentRequest { resolution_notes: str }` | `IncidentItem { incident_code, status: 'resolved', resolution_notes, resolved_at }` | Bearer Token | **Integrated & Tested** |

---

## 9. AI Analysis Domain (`backend/ai/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/ai-analysis/demo` | Run AI diagnostic demo on sample incident | Body: `DemoAnalysisRequest { scenario?: str }` | `AIAnalysisResponse { incident_code, root_cause_hypothesis, confidence_score, impact_scope, suggested_mitigation, logs_analyzed }` | Bearer Token | **Integrated & Tested** |
| `POST` | `/ai-analysis/{incident_code}` | Run LLM root-cause diagnostic on incident | Path: `incident_code: str` | `AIAnalysisResponse { incident_code, root_cause_hypothesis, confidence_score, impact_scope, suggested_mitigation, affected_downstream }` | Bearer Token | **Integrated & Tested** |

---

## 10. RAG Knowledge Assistant Domain (`backend/rag/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/rag/ask` | Ask data platform documentation & incident playbooks | `RAGQueryRequest { question: str, top_k?: int, filter_category?: str }` | `RAGQueryResponse { answer: str, citations: List[SourceCitation { title, doc_id, snippet, score }], search_latency_ms }` | Bearer Token | **Integrated & Tested** |

---

## 11. Agent Investigations Domain (`backend/agents/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/agent/investigate` | Run synchronous LangGraph agentic investigation | `AgentInvestigateRequest { dataset_name, incident_code?, query, max_iterations? }` | `AgentInvestigationResult { investigation_id, status: 'completed', steps_taken, root_cause, mitigation_steps, confidence }` | Bearer Token | **Integrated & Tested** |
| `POST` | `/agent/investigate/async` | Dispatch asynchronous Celery investigation task | `AgentInvestigateRequest { dataset_name, incident_code?, query }` | `AsyncTaskResponse { task_id, status: 'queued', message, created_at }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/agent/tasks/{task_id}` | Poll asynchronous task status or final result | Path: `task_id: str` | `TaskStatusResponse { task_id, status: 'queued'|'running'|'completed'|'failed', progress?, result?, error? }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/agent/history` | View historical agent investigation runs | None | `List[AgentInvestigationSummary { id, task_id, dataset_name, query, status, duration_sec, created_at }]` | Bearer Token | **Integrated & Tested** |
| `POST` | `/agent/maintenance/recover-stale` | Maintenance: recover or cancel stale Celery tasks | Body: `RecoverStaleRequest { older_than_minutes?: int }` | `RecoverStaleResponse { tasks_inspected, tasks_recovered, message }` | Bearer Token (Role: Admin/Lead) | **Integrated & Tested** |
| `GET` | `/agent/metrics` | Retrieve autonomous agent operational metrics | None | `AgentMetricsResponse { total_investigations, avg_duration_sec, success_rate, tokens_consumed, active_agents }` | Bearer Token | **Integrated & Tested** |

---

## 12. Failure Prediction Domain (`backend/prediction/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/predictions/failure/model-status` | Check status and version of ML failure model | None | `ModelStatusResponse { model_name, version, status, trained_at, algorithm, feature_count }` | Bearer Token | **Integrated & Tested** |
| `POST` | `/predictions/failure/{dataset_name}` | Predict pipeline failure probability for dataset | Path: `dataset_name: str` | `PredictionResultResponse { dataset_name, failure_probability, risk_level: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', key_risk_factors, timestamp }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/predictions/failure/{dataset_name}/history` | Retrieve historical failure predictions | Path: `dataset_name: str` | `List[PredictionHistoryItem { id, timestamp, failure_probability, risk_level, actual_outcome? }]` | Bearer Token | **Integrated & Tested** |
| `GET` | `/predictions/evaluation` | Model validation and performance metrics | None | `ModelEvaluationResponse { roc_auc, accuracy, precision, recall, f1_score, confusion_matrix, feature_importances }` | Bearer Token | **Integrated & Tested** |

---

## 13. Pipeline Runs Domain (`backend/pipeline_runs/routes.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/pipeline-runs` | List execution runs across all pipelines | Query: `status?`, `dataset_name?`, `limit?` | `List[PipelineRunItem { run_id, pipeline_name, dataset_name, status, started_at, completed_at?, duration_sec?, error_message? }]` | Bearer Token | **Integrated & Tested** |
| `GET` | `/pipeline-runs/summary` | Aggregated metrics for pipeline executions | None | `PipelineSummaryResponse { total_runs, successful_runs, failed_runs, running_runs, pass_rate, avg_duration_sec }` | Bearer Token | **Integrated & Tested** |
| `GET` | `/pipeline-runs/{run_id}` | Retrieve full trace & details of specific run | Path: `run_id: str` | `PipelineRunDetail { run_id, pipeline_name, dataset_name, status, started_at, completed_at, duration_sec, steps: List[PipelineStep], logs: str, metrics }` | Bearer Token | **Integrated & Tested** |

---

## 14. Core Health & Diagnostics Domain (`backend/main.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Application identity and welcome banner | None | `RootResponse { app_name, version, status, docs_url }` | None | **Integrated & Tested** |
| `GET` | `/health` | API service health check | None | `HealthResponse { status: 'healthy', timestamp, uptime_sec }` | None | **Integrated & Tested** |
| `GET` | `/health/database` | Database connectivity verification | None | `DatabaseHealthResponse { status: 'connected'|'disconnected', latency_ms, error? }` (Note: returns HTTP 503 if DB down) | None | **Integrated & Tested** |

---

## 15. Prometheus Metrics Domain (`backend/monitoring/prometheus_metrics.py`)

| Method | Exact Endpoint | Purpose | Request Schema | Response Schema | Auth Required | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/metrics` | Prometheus scraper endpoint (`include_in_schema=False`) | None | Plaintext Prometheus exposition format (`# HELP ... \n # TYPE ...`) | Optional / None | **Integrated & Tested** |

---

## Integration Summary & Resilience Architecture

1. **Dual-Mode Adapter Pattern**:
   The frontend uses a centralized API client with an adaptive failover architecture:
   - When the live FastAPI backend is reachable at `http://localhost:8000` (or configured `VITE_API_BASE_URL`), all live requests, authentication tokens, and headers are dispatched directly.
   - When backend services or Docker containers are offline, the frontend falls back gracefully to deterministic, realistic mock fixtures while clearly alerting the user via the `Live Backend / Mock Fixture Mode` status indicator.
2. **Error Taxonomy**:
   - `401 Unauthorized` triggers redirect or session renewal alert.
   - `403 Forbidden` handles role-based barriers (e.g. Non-Admin attempting `/auth/admin-test` or `/agent/maintenance/recover-stale`).
   - `422 Unprocessable Entity` extracts and renders field-level Pydantic error details.
   - `503 Service Unavailable` on `/health/database` explicitly informs the user that PostgreSQL is unreachable while the API container is running.
