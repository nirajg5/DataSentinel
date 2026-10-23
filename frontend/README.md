# DataSentinel — Enterprise Data Reliability & Observability Platform

DataSentinel is an enterprise-grade data reliability, pipeline observability, and automated incident investigation platform. It provides automated data contract validation, freshness SLA tracking, composite reliability scoring, gradient-boosted pipeline failure forecasting, and LangGraph-powered autonomous multi-agent root cause analysis.

---

## 🛠️ Technology Stack

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons
- **State & Server Cache**: TanStack Query (React Query)
- **Routing**: React Router DOM (v7)
- **Data Visualization**: Recharts (Throughput, SLA Lags, Reliability trends, Feature Importance)
- **HTTP Client**: Centralized Axios instance with JWT Bearer interceptor & Pydantic error formatting

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key configuration variables:
```env
# Backend API Base URL (FastAPI server)
VITE_API_BASE_URL=http://localhost:8000

# Adaptive Mock Fallback (when Docker or backend dependencies are offline)
VITE_USE_MOCK_FALLBACK=true

# API request timeout (ms)
VITE_API_TIMEOUT=15000
```

### 2. Development Startup

Install dependencies and start the Vite development server on port 3000:

```bash
npm install
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 🔄 Dual-Mode Architecture: Live Backend & Development Without Docker

DataSentinel is engineered with an adaptive failover architecture:

1. **Live Backend Mode**:
   When the FastAPI backend is running locally at `http://localhost:8000`, all requests (JWT authentication, database queries, Celery async investigations, Great Expectations checks) dispatch directly to the backend. The header displays a green `Live (Xms)` status badge.
2. **Adaptive Mock Fixture Mode (Offline / No-Docker)**:
   When Docker or PostgreSQL is not running, the application gracefully activates high-fidelity local fixtures that adhere strictly to all 34 OpenAPI schemas. The UI displays an amber notification banner and distinguishes real vs mock data without breaking interactive testing.
3. **Mode Switcher**:
   The header contains a toggle (`Adaptive` vs `Live Only`) allowing engineers to test live endpoints or switch roles between **Admin**, **Data Engineer**, and **Analyst** with one click.

---

## 📋 Comprehensive Route Inventory & API Mapping

See [`docs/frontend-api-inventory.md`](docs/frontend-api-inventory.md) for full endpoint specifications, request/response schemas, and integration statuses across all 15 domains:

- **Authentication**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/admin-test`
- **Datasets**: `GET /datasets/`
- **Ingestion**: `POST /ingestion/dataset`
- **ETL Transformations**: `POST /etl/silver/{dataset_type}`, `POST /etl/gold/build`
- **Data Quality**: `POST /quality/check/{dataset_type}`
- **Freshness SLAs**: `POST /freshness/check/{dataset_name}`
- **Reliability Index**: `POST /reliability/calculate/{dataset_type}`
- **Incident Management**: `POST /incidents/detect/{dataset_name}`, `POST /incidents/detect-pipeline-failures/{dataset_name}`, `GET /incidents/`, `PATCH /incidents/{incident_code}/resolve`
- **AI Diagnostics**: `POST /ai-analysis/demo`, `POST /ai-analysis/{incident_code}`
- **RAG Knowledge Assistant**: `POST /rag/ask`
- **LangGraph Multi-Agent**: `POST /agent/investigate`, `POST /agent/investigate/async`, `GET /agent/tasks/{task_id}`, `GET /agent/history`, `POST /agent/maintenance/recover-stale`, `GET /agent/metrics`
- **Failure Predictions**: `GET /predictions/failure/model-status`, `POST /predictions/failure/{dataset_name}`, `GET /predictions/failure/{dataset_name}/history`, `GET /predictions/evaluation`
- **Pipeline Runs**: `GET /pipeline-runs`, `GET /pipeline-runs/summary`, `GET /pipeline-runs/{run_id}`
- **System Diagnostics**: `GET /`, `GET /health`, `GET /health/database`, `GET /metrics`

---

## 🛡️ Role-Based Access Control (RBAC)

The platform supports distinct permission scopes tested via `GET /auth/admin-test`:
- **Admin**: Full access to all modules, including Celery stale task recovery (`/agent/maintenance/recover-stale`) and admin verification.
- **Data Engineer**: Pipeline triggers, Silver/Gold ETL execution, Quality suites, and ML failure predictions.
- **Analyst**: Incident dashboards, RAG knowledge assistant, and SLA reports.
