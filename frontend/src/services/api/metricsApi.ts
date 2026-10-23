import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_PROMETHEUS_RAW } from '../../mocks/fixtures';
import { PrometheusMetricItem } from '../../types/api';

export function parsePrometheusText(text: string): PrometheusMetricItem[] {
  const lines = text.split('\n');
  const items: PrometheusMetricItem[] = [];
  let currentHelp = '';
  let currentType = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# HELP ')) {
      const parts = trimmed.substring(7).split(' ');
      const name = parts[0];
      currentHelp = parts.slice(1).join(' ');
      continue;
    }
    if (trimmed.startsWith('# TYPE ')) {
      const parts = trimmed.substring(7).split(' ');
      currentType = parts[1] || 'gauge';
      continue;
    }

    // Metric line
    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]+)\})?\s+([0-9.eE+-]+)$/);
    if (match) {
      const name = match[1];
      const labelStr = match[2];
      const val = parseFloat(match[3]);

      const labels: Record<string, string> = {};
      if (labelStr) {
        const pairs = labelStr.split(',');
        for (const p of pairs) {
          const [k, v] = p.split('=');
          if (k && v) {
            labels[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
          }
        }
      }

      items.push({
        name,
        type: currentType || 'gauge',
        help: currentHelp,
        value: val,
        labels: Object.keys(labels).length > 0 ? labels : undefined,
      });
    }
  }

  return items;
}

export const metricsApi = {
  async getMetricsRaw(): Promise<{ raw: string; parsed: PrometheusMetricItem[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<string>('/metrics', {
          responseType: 'text',
          transformResponse: [(data) => data],
        });
        const raw = res.data;
        return {
          raw,
          parsed: parsePrometheusText(raw),
        };
      },
      () => ({
        raw: MOCK_PROMETHEUS_RAW,
        parsed: parsePrometheusText(MOCK_PROMETHEUS_RAW),
      })
    ).then((res) => ({
      raw: res.data.raw,
      parsed: res.data.parsed,
      isLive: res.isLive,
    }));
  },
};
