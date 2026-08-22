import { ApiError as SharedApiError, createApiClient, type QueryParams } from '@webhatchery/api-client';
import { requiredEnv } from './env';
import { ApiError } from './types';
import { readAuthToken, readFrontpageToken, readGuestSession } from './sessionStorage';

type RequestConfig = { params?: QueryParams; headers?: HeadersInit };
type ApiResponse<T> = { data: T; status: number };
let onUnauthorized: ((loginUrl: string | null) => void) | null = null;

export const registerUnauthorizedCallback = (callback: (loginUrl: string | null) => void): void => {
  onUnauthorized = callback;
};

const sharedApi = createApiClient({
  baseURL: requiredEnv('VITE_API_BASE_URL'),
  preserveEnvelope: true,
  tokenProvider: () => readFrontpageToken() ?? readGuestSession()?.token ?? readAuthToken(),
  onUnauthorized: (error) => {
    onUnauthorized?.(
      error instanceof SharedApiError ? error.loginUrl ?? null : null,
    );
  },
});

const request = async <T>(method: string, endpoint: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => ({
  data: await sharedApi.request<T>(endpoint, {
    method,
    body,
    headers: config?.headers,
    query: config?.params,
  }),
  status: 200,
});

const api = {
  get: <T>(endpoint: string, config?: RequestConfig) => request<T>('GET', endpoint, undefined, config),
  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) => request<T>('POST', endpoint, body, config),
  put: <T>(endpoint: string, body?: unknown, config?: RequestConfig) => request<T>('PUT', endpoint, body, config),
  delete: <T>(endpoint: string, config?: RequestConfig) => request<T>('DELETE', endpoint, undefined, config),
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof SharedApiError) {
    return new ApiError(error.message, error.status, error.loginUrl ?? null);
  }

  return error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : 'Backend request failed.', 500);
}

export default api;
