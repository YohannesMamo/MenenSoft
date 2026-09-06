// Central API configuration with multi-host failover.
//
// The app can be served from more than one backend deployment (primary first,
// then alternatives). At runtime we probe each candidate and remember the first
// reachable host so the app keeps working if the primary backend goes down.

// Ordered backend candidates (primary -> alternatives).
const CANDIDATES = [
  'https://menen-oshd-api.pxxl.click',
  'https://menenoshs-api.onrender.com',
];

let cachedBase: string | null = null;
let probing: Promise<string> | null = null;

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, '');
}

/** Synchronous best-known base (cached result, env override, or first candidate). */
export function getApiBase(): string {
  if (cachedBase) return cachedBase;
  const env = import.meta.env.VITE_API_URL;
  if (env) return normalizeBase(env);
  return normalizeBase(CANDIDATES[0]);
}

/** The full ordered list of backend candidates to try. */
export function getApiCandidates(): string[] {
  const list: string[] = [];
  const env = import.meta.env.VITE_API_URL;
  if (env) list.push(env);
  for (const c of CANDIDATES) list.push(c);
  return Array.from(new Set(list));
}

// A server is "reachable" if it returns *any* HTTP response (even 4xx/5xx).
// Only a network error, DNS failure, or timeout means the host is down.
async function probe(base: string, timeoutMs = 7000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${normalizeBase(base)}/`, { signal: ctrl.signal, method: 'GET' });
    clearTimeout(t);
    return res !== null;
  } catch {
    return false;
  }
}

/** Probe candidates once and remember the working backend host. */
export async function resolveApiBase(): Promise<string> {
  if (cachedBase) return cachedBase;
  if (probing) return probing;
  probing = (async () => {
    for (const base of getApiCandidates()) {
      if (await probe(base)) {
        cachedBase = normalizeBase(base);
        break;
      }
    }
    if (!cachedBase) cachedBase = getApiCandidates()[0];
    try { localStorage.setItem('apiBase', cachedBase); } catch { /* ignore */ }
    return cachedBase;
  })();
  return probing;
}

// Legacy constant so existing importers keep working. It reflects the best-known
// base at import time (call resolveApiBase() for the async, host-probing value).
export const API_BASE_URL = getApiBase();

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const base = await resolveApiBase();
  const token = localStorage.getItem('token');

  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    const AUTH_KEYS = ['token', 'userId', 'userEmail', 'userRole', 'studentId', 'userName', 'subscriptionStatus'];
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return response;
};

export const API_URL = API_BASE_URL;
