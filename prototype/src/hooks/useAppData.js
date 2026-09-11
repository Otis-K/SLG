import { useCallback, useEffect, useState } from 'react';
import { appDataSource } from '../data-source/index.js';

export function useAppData() {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    appDataSource.loadAppData({ signal: controller.signal })
      .then((data) => setState({ status: 'success', data, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error });
      });
    return () => controller.abort();
  }, [requestKey]);

  const reload = useCallback(() => setRequestKey((key) => key + 1), []);

  return { ...state, reload, dataSource: appDataSource };
}
