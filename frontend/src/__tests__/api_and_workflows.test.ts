import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePrometheusText } from '../services/api/metricsApi';
import { MOCK_PROMETHEUS_RAW, MOCK_USERS, MOCK_DATASETS, MOCK_INCIDENTS } from '../mocks/fixtures';
import { formatApiError } from '../lib/api-client';

describe('DataSentinel Integration & Core Workflows', () => {
  it('parses Prometheus raw metrics text format into structured data', () => {
    const parsed = parsePrometheusText(MOCK_PROMETHEUS_RAW);
    assert(parsed.length >= 5, `Expected at least 5 parsed metrics, got ${parsed.length}`);

    const runMetrics = parsed.filter((m) => m.name === 'datasentinel_pipeline_runs_total');
    assert(runMetrics.length === 3, 'Expected 3 pipeline run status metrics');

    const successMetric = runMetrics.find((m) => m.labels?.status === 'success');
    assert.strictEqual(successMetric?.value, 139);

    const latencyMetric = parsed.find((m) => m.name === 'datasentinel_db_connection_latency_seconds');
    assert.strictEqual(latencyMetric?.value, 0.0034);
  });

  it('verifies dataset inventory fixtures meet contract schemas', () => {
    assert(MOCK_DATASETS.length >= 5, 'Should contain at least 5 standard datasets');
    for (const ds of MOCK_DATASETS) {
      assert(ds.name, 'Dataset must have name');
      assert(ds.dataset_type, 'Dataset must have dataset_type');
      assert(['bronze', 'silver', 'gold'].includes(ds.layer), 'Dataset must belong to bronze, silver, or gold layer');
      assert(typeof ds.row_count === 'number', 'Row count must be numeric');
    }
  });

  it('formats FastAPI and Pydantic validation errors appropriately', () => {
    const pydanticError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'dataset_name'], msg: 'field required' },
            { loc: ['body', 'batch_size'], msg: 'value is not a valid integer' },
          ],
        },
      },
    };
    const formatted = formatApiError(pydanticError);
    assert(formatted.includes('body.dataset_name: field required'));
    assert(formatted.includes('body.batch_size: value is not a valid integer'));
  });

  it('correctly validates RBAC users and roles', () => {
    assert.strictEqual(MOCK_USERS.admin.role, 'admin');
    assert.strictEqual(MOCK_USERS.data_engineer.role, 'data_engineer');
    assert.strictEqual(MOCK_USERS.analyst.role, 'analyst');
  });

  it('validates incident severity and status contracts', () => {
    for (const inc of MOCK_INCIDENTS) {
      assert(inc.incident_code.startsWith('INC-'), 'Incident code must start with INC-');
      assert(['critical', 'high', 'medium', 'low'].includes(inc.severity), 'Valid severity');
      assert(['open', 'investigating', 'resolved', 'dismissed'].includes(inc.status), 'Valid status');
    }
  });
});
