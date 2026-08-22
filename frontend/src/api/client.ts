// src/api/client.ts
import axios, { type AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api', // FastAPI backend via Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;