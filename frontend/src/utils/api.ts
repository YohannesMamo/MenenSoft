import { resolveApiBase } from '../config/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const base = await resolveApiBase();

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`${base}${endpoint}`, config);

  if (response.status === 401) {
    const AUTH_KEYS = ['token', 'userId', 'userEmail', 'userRole', 'studentId', 'userName', 'subscriptionStatus'];
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return response;
};
