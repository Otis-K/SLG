import { useCallback, useEffect, useState } from 'react';
import { appDataSource } from '../data-source/index.js';
import { getAccessToken, getCachedBootstrap, setCachedBootstrap } from '../data-source/storage.js';

export function useAppData({ enabled = true } = {}) {
  const [requestKey, setRequestKey] = useState(0);
  const token = appDataSource.getAccessToken?.() ?? getAccessToken();
  const requiresLogin = appDataSource.mode === 'api' && !token;
  const cached = enabled && !requiresLogin ? getCachedBootstrap() : null;
  const [state, setState] = useState(() => {
    if (!enabled || requiresLogin) return { status: 'success', data: null, error: null, requiresLogin };
    if (cached) return { status: 'success', data: cached, error: null, fromCache: true };
    return { status: 'loading', data: null, error: null };
  });

  useEffect(() => {
    if (!enabled || requiresLogin) return undefined;
    const controller = new AbortController();
    setState((current) => ({
      status: current.data ? current.status : 'loading',
      data: current.data,
      error: null,
      fromCache: Boolean(current.data),
    }));
    appDataSource.loadAppData({ signal: controller.signal })
      .then((data) => {
        setCachedBootstrap(data);
        setState({ status: 'success', data, error: null, fromCache: false });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (cached) {
          setState({ status: 'success', data: cached, error, fromCache: true });
          return;
        }
        setState({ status: 'error', data: null, error });
      });
    return () => controller.abort();
  }, [enabled, requestKey, requiresLogin]);

  const reload = useCallback(() => setRequestKey((key) => key + 1), []);

  return { ...state, reload, requiresLogin, dataSource: appDataSource };
}
