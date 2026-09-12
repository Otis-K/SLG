import { DataSourceError } from './contracts.js';
import { createMockDataSource } from './mock/adapter.js';
import { createHttpDataSource } from './real/adapter.js';

export function createDataSource({ mode = 'mock', apiBaseUrl = '/api/v1', fetchImpl, mockLatencyMs } = {}) {
  if (mode === 'mock') return createMockDataSource({ latencyMs: mockLatencyMs });
  if (mode === 'api' || mode === 'real') return createHttpDataSource({ baseUrl: apiBaseUrl, fetchImpl });
  throw new DataSourceError(`未知数据源：${mode}`, { code: 'UNKNOWN_DATA_SOURCE' });
}

function getRuntimeMode() {
  const queryMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('dataSource')
    : null;
  return queryMode || import.meta.env?.VITE_DATA_SOURCE || 'api';
}

export const appDataSource = createDataSource({
  mode: getRuntimeMode(),
  apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1',
});
