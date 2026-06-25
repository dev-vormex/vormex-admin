import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { removeToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const CSRF_COOKIE = 'vx_csrf';
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase();
    const csrfToken = Cookies.get(CSRF_COOKIE);
    if (csrfToken && UNSAFE_METHODS.has(method)) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const url = originalRequest?.url || '';

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/google')
    ) {
      originalRequest._retry = true;
      try {
        const csrfToken = Cookies.get(CSRF_COOKIE);
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
          }
        );
        const nextCsrfToken = refreshResponse.data?.csrfToken;
        if (nextCsrfToken) {
          Cookies.set(CSRF_COOKIE, nextCsrfToken, {
            expires: 30,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        }
        return apiClient(originalRequest);
      } catch {
        // Continue to auth cleanup below.
      }
    }

    if (error.response?.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const authPageCanHandleError =
          pathname === '/login' || pathname === '/auth/google/callback';
        if (!authPageCanHandleError) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
