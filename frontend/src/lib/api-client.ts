import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000';

export interface ApiClientConfig {
  useMockFallback: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout:
    Number(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TIMEOUT) ||
    15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('datasentinel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to format Pydantic and FastAPI errors
export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail)) {
        // FastAPI / Pydantic validation error list
        return data.detail
          .map((item: { loc?: string[]; msg?: string }) => {
            const field = item.loc ? item.loc.join('.') : 'field';
            return `${field}: ${item.msg || 'invalid'}`;
          })
          .join(', ');
      }
      if (data.message) {
        return data.message;
      }
    }
    if (error.response?.status === 503) {
      return 'Service Unavailable (503): Database or dependency connection failure.';
    }
    if (error.response?.status === 404) {
      return `Resource not found (404): ${error.config?.url || ''}`;
    }
    if (error.response?.status === 401) {
      return 'Unauthorized (401): Valid authentication credentials required.';
    }
    if (error.response?.status === 403) {
      return 'Forbidden (403): You do not have permission for this resource.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out waiting for backend response.';
    }
    if (error.message === 'Network Error' || !error.response) {
      return `Network Error: Cannot connect to DataSentinel backend at ${API_BASE_URL}. Ensure FastAPI is running.`;
    }
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export function isNetworkOrOfflineError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
  }
  return false;
}

/**
 * Robust dispatcher: attempts live backend API call first.
 * If backend is unreachable (Docker/server offline) and mock fallback is allowed,
 * it returns the mock fixture, but marks it with metadata so UI can clearly display the source.
 */
export async function executeApiWithFallback<T>(
  apiFn: () => Promise<T>,
  mockFn: () => T | Promise<T>,
  options?: { forceLive?: boolean; fallbackReason?: string }
): Promise<{ data: T; isLive: boolean; error?: string }> {
  const allowMock = localStorage.getItem('datasentinel_mode') !== 'live_only';

  if (!options?.forceLive && !allowMock) {
    try {
      const data = await apiFn();
      return { data, isLive: true };
    } catch (err) {
      throw new Error(formatApiError(err));
    }
  }

  try {
    const data = await apiFn();
    return { data, isLive: true };
  } catch (err) {
    const isOffline = isNetworkOrOfflineError(err);
    // If backend is down or 503 and mock fallback is allowed:
    if (allowMock && (isOffline || (err as AxiosError)?.response?.status === 503)) {
      const fallbackData = await mockFn();
      return {
        data: fallbackData,
        isLive: false,
        error: isOffline
          ? `Live backend at ${API_BASE_URL} unreachable. Switched to verified mock fixture.`
          : `Live backend reported 503 dependency failure. Switched to mock fixture.`,
      };
    }
    throw new Error(formatApiError(err));
  }
}
