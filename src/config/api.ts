export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = API_BASE_URL;

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
