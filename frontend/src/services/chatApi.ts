// Chat HTTP helpers.
//
// Chat previously called relative paths such as `/api/chat/students`. Because the
// SPA is served from the static frontend host and the API lives on a different
// origin, those requests hit the wrong host and returned 404. Every chat request
// now goes through the same base-URL resolver the rest of the app uses.
import axios, { type AxiosRequestConfig } from 'axios';
import { getApiBase, resolveApiBase } from '../config/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: 'get' | 'post',
  path: string,
  data?: unknown,
  config: AxiosRequestConfig = {}
) {
  const base = await resolveApiBase();
  return axios.request<T>({
    ...config,
    url: `${base}${path}`,
    method,
    data,
    headers: {
      ...authHeaders(),
      ...(config.headers as Record<string, string> | undefined),
    },
  });
}

export const chatApi = {
  get: <T = any>(path: string, config?: AxiosRequestConfig) =>
    request<T>('get', path, undefined, config),
  post: <T = any>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>('post', path, data, config),
};

/**
 * Turn a server-relative chat file path (`/files/chat_files/x.pdf`) into an
 * absolute URL on the API host, so downloads and previews work in production.
 */
export function chatFileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;

  let base = getApiBase();
  try {
    base = localStorage.getItem('apiBase') || base;
  } catch {
    /* localStorage unavailable */
  }

  return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
