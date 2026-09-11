import { getCalendars } from 'expo-localization';
import { getLocalDate } from '../config/frontendConfig';
import type {
  ActivatePlanInput,
  ActivatePlanResult,
  AppDataSource,
  DataSourceMode,
  OnboardingProfile,
} from '../domain/types';
import {
  DataSourceError,
  validateBootstrapResponse,
  validatePlanSuggestionResponse,
} from './contracts';
import {
  buildMockActivationResult,
  buildMockPlanResponse,
  createMockBootstrapResponse,
} from './mockSeed';

const DEFAULT_TIMEOUT_MS = 10_000;

function delay(milliseconds: number) {
  return milliseconds > 0
    ? new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

function getTimeZoneId(): string {
  return getCalendars()[0]?.timeZone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    ?? 'Asia/Shanghai';
}

function createMockDataSource(latencyMs = 90): AppDataSource {
  return {
    mode: 'mock',
    label: 'Mock 演示数据',

    async loadAppData(options = {}) {
      await delay(latencyMs);
      const response = createMockBootstrapResponse(options.localDate ?? getLocalDate());
      return validateBootstrapResponse(response, 'mock');
    },

    async previewPlans(profile) {
      await delay(latencyMs);
      return validatePlanSuggestionResponse(buildMockPlanResponse(profile), 'mock');
    },

    async activatePlans(payload) {
      await delay(latencyMs);
      return buildMockActivationResult(payload);
    },
  };
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
};

function createHttpClient(baseUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(normalizedBaseUrl)) {
    throw new DataSourceError('真实 API 模式需要 EXPO_PUBLIC_API_BASE_URL 绝对地址', {
      code: 'INVALID_API_BASE_URL',
    });
  }

  return async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
      if (controller.signal.aborted) {
        throw new DataSourceError('后端请求超时或已取消', {
          code: 'REQUEST_ABORTED',
          retryable: true,
          cause: error,
        });
      }
      throw new DataSourceError('无法连接后端服务', {
        code: 'NETWORK_ERROR',
        retryable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  };
}

function normalizeActivatePlanResult(value: unknown, payload: ActivatePlanInput): ActivatePlanResult {
  if (!value || typeof value !== 'object') {
    throw new DataSourceError('计划启用响应数据契约错误', { code: 'INVALID_PAYLOAD' });
  }
  const candidate = value as Partial<ActivatePlanResult>;
  const currentWeightKg = candidate.currentWeightKg;
  if (!candidate.targets
    || !Object.values(candidate.targets).every((target) => Number.isFinite(target) && target >= 0)
    || !candidate.trainingPlan
    || !Array.isArray(candidate.trainingPlan.sessions)
    || typeof currentWeightKg !== 'number'
    || !Number.isFinite(currentWeightKg)) {
    throw new DataSourceError('计划启用响应数据契约错误', { code: 'INVALID_PAYLOAD' });
  }
  return {
    targets: candidate.targets,
    currentWeightKg,
    trainingPlan: {
      ...payload.trainingPlan,
      ...candidate.trainingPlan,
      planVersionId: candidate.trainingPlan.planVersionId ?? `training-${payload.suggestionId}`,
      status: 'active',
      effectiveFromLocalDate: candidate.trainingPlan.effectiveFromLocalDate ?? getLocalDate(),
    },
  };
}

function createHttpDataSource(baseUrl: string): AppDataSource {
  const request = createHttpClient(baseUrl);

  return {
    mode: 'api',
    label: '真实 API 数据',

    async loadAppData(options = {}) {
      const query = new URLSearchParams({
        localDate: options.localDate ?? getLocalDate(),
        timeZoneId: options.timeZoneId ?? getTimeZoneId(),
      });
      const response = await request(`/app-bootstrap?${query.toString()}`, { signal: options.signal });
      return validateBootstrapResponse(response, 'api');
    },

    async previewPlans(profile: OnboardingProfile, options = {}) {
      const response = await request('/plan-suggestions', {
        method: 'POST',
        body: { profile },
        signal: options.signal,
      });
      return validatePlanSuggestionResponse(response, 'api');
    },

    async activatePlans(payload: ActivatePlanInput, options = {}) {
      const response = await request('/plans/activate', {
        method: 'POST',
        body: payload,
        signal: options.signal,
      });
      const data = (response as { data?: unknown } | null)?.data;
      return normalizeActivatePlanResult(data, payload);
    },
  };
}

export function createDataSource(options: {
  mode?: DataSourceMode;
  apiBaseUrl?: string;
  mockLatencyMs?: number;
} = {}): AppDataSource {
  const mode = options.mode ?? 'mock';
  if (mode === 'mock') return createMockDataSource(options.mockLatencyMs);
  if (mode === 'api') return createHttpDataSource(options.apiBaseUrl ?? '');
  throw new DataSourceError(`未知数据源：${String(mode)}`, { code: 'UNKNOWN_DATA_SOURCE' });
}

function getRuntimeMode(): DataSourceMode {
  const configured = process.env.EXPO_PUBLIC_DATA_SOURCE?.trim().toLowerCase();
  if (!configured || configured === 'mock') return 'mock';
  if (configured === 'api' || configured === 'real') return 'api';
  throw new DataSourceError(`未知数据源：${configured}`, { code: 'UNKNOWN_DATA_SOURCE' });
}

export const appDataSource = createDataSource({
  mode: getRuntimeMode(),
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
});
