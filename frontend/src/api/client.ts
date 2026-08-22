import axios from "axios";
import { requiredEnv } from "./env";
import { ApiError } from "./types";
import {
  readAuthToken,
  readFrontpageToken,
  readGuestSession,
} from "./sessionStorage";

const api = axios.create({
  baseURL: requiredEnv("VITE_API_BASE_URL"),
  headers: {
    "Content-Type": "application/json",
  },
});

let onUnauthorized: ((loginUrl: string | null) => void) | null = null;

export const registerUnauthorizedCallback = (
  callback: (loginUrl: string | null) => void,
) => {
  onUnauthorized = callback;
};

api.interceptors.request.use((config) => {
  const frontpageToken = readFrontpageToken();
  const guestToken = readGuestSession()?.token;
  const token = frontpageToken ?? guestToken ?? readAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const maybeAxiosError = error as {
      response?: {
        status?: number;
        data?: {
          error?: string;
          message?: string;
          login_url?: string;
        };
      };
      message?: string;
    };

    if (maybeAxiosError.response?.status === 401) {
      const loginUrl = maybeAxiosError.response.data?.login_url ?? null;
      void onUnauthorized;
      void loginUrl;
    }

    return Promise.reject(error);
  },
);

export function toApiError(error: unknown): ApiError {
  const maybeAxiosError = error as {
    response?: {
      status?: number;
      data?: {
        error?: string;
        message?: string;
        login_url?: string;
      };
    };
    message?: string;
  };
  const status = maybeAxiosError.response?.status ?? 500;
  const message =
    maybeAxiosError.response?.data?.error ||
    maybeAxiosError.response?.data?.message ||
    maybeAxiosError.message ||
    "Backend request failed.";

  return new ApiError(
    message,
    status,
    maybeAxiosError.response?.data?.login_url ?? null,
  );
}

export default api;
