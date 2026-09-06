// src/api/client.ts
import axios, { type AxiosInstance } from 'axios';
import { resolveApiBase } from '../config/api';

const api: AxiosInstance = axios.create({
  baseURL: '/api', // FastAPI backend via Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Resolve the reachable backend host before each request (multi-host failover).
api.interceptors.request.use(async (config) => {
  const base = await resolveApiBase();
  config.baseURL = `${base}/api`;
  return config;
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