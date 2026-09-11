import { validateBootstrapResponse, validatePlanSuggestionResponse } from '../contracts.js';
import { createHttpClient } from './httpClient.js';

export function createHttpDataSource(options = {}) {
  const request = createHttpClient(options);

  return {
    mode: 'api',
    label: '真实 API',

    async loadAppData({ signal, localDate, timeZoneId } = {}) {
      const query = new URLSearchParams({
        localDate: localDate || new Date().toISOString().slice(0, 10),
        timeZoneId: timeZoneId || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const response = await request(`/app-bootstrap?${query}`, { signal });
      return validateBootstrapResponse(response, 'api');
    },

    async previewPlans(profile, { signal } = {}) {
      const response = await request('/plan-suggestions', { method: 'POST', body: { profile }, signal });
      return validatePlanSuggestionResponse(response, 'api');
    },

    async activatePlans(payload, { signal } = {}) {
      const response = await request('/plans/activate', { method: 'POST', body: payload, signal });
      return response.data;
    },
  };
}
