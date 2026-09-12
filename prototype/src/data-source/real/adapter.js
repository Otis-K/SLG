import { validateBootstrapResponse, validatePlanSuggestionResponse } from '../contracts.js';
import { createHttpClient } from './httpClient.js';
import {
  clearAccessToken as clearStoredToken,
  getAccessToken,
  setAccessToken as persistToken,
} from '../storage.js';

export function createHttpDataSource(options = {}) {
  let accessToken = options.accessToken || getAccessToken();
  const request = createHttpClient({
    ...options,
    getAccessToken: () => accessToken,
  });

  return {
    mode: 'api',
    label: '真实 API',

    getAccessToken: () => accessToken,

    setAccessToken(token) {
      accessToken = token || null;
      persistToken(accessToken);
    },

    clearAccessToken() {
      accessToken = null;
      clearStoredToken();
    },

    async requestSmsCode(phone, { signal } = {}) {
      const response = await request('/auth/sms-code', { method: 'POST', body: { phone }, signal });
      return response.data;
    },

    async loginWithCode(phone, code, { signal } = {}) {
      const response = await request('/auth/login', { method: 'POST', body: { phone, code }, signal });
      if (!response.data?.accessToken) throw new Error('登录响应缺少 accessToken');
      this.setAccessToken(response.data.accessToken);
      return response.data;
    },

    async saveProfile(profile, { signal } = {}) {
      const response = await request('/profile', { method: 'PUT', body: profile, signal });
      return response.data;
    },

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

    async searchFoods({ q = '', page = 1, pageSize = 40, signal } = {}) {
      const query = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
      const response = await request(`/foods/search?${query}`, { signal });
      return response;
    },

    async createCustomFood(payload, { signal } = {}) {
      const response = await request('/foods', { method: 'POST', body: payload, signal });
      return response.data;
    },

    async estimateMeal(payload, { signal } = {}) {
      const response = await request('/ai/estimate', { method: 'POST', body: payload, signal });
      return response.data;
    },

    async createMealEntry(payload, { signal } = {}) {
      const response = await request('/meal-entries', { method: 'POST', body: payload, signal });
      return response.data;
    },
  };
}
