import { DataSourceError } from '../contracts.js';

export function createHttpClient({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
  if (typeof fetchImpl !== 'function') throw new DataSourceError('当前环境不支持 fetch', { code: 'FETCH_UNAVAILABLE' });
  const normalizedBaseUrl = String(baseUrl || '/api/v1').replace(/\/$/, '');

  return async function request(path, { method = 'GET', body, signal } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new DataSourceError(`后端请求失败（HTTP ${response.status}）`, {
          code: 'HTTP_ERROR',
          status: response.status,
          retryable: response.status >= 500 || response.status === 429,
        });
      }
      try {
        return await response.json();
      } catch (cause) {
        throw new DataSourceError('后端返回了无效 JSON', { code: 'INVALID_JSON', cause });
      }
    } catch (error) {
      if (error instanceof DataSourceError) throw error;
      if (controller.signal.aborted) throw new DataSourceError('后端请求超时或已取消', { code: 'REQUEST_ABORTED', retryable: true, cause: error });
      throw new DataSourceError('无法连接后端服务', { code: 'NETWORK_ERROR', retryable: true, cause: error });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  };
}
