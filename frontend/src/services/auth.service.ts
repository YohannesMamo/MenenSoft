// services/auth.service.ts
import type { LoginCredentials, RegisterData, AuthResponse } from '../types/auth.types';
import { resolveApiBase } from '../config/api';

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send reset link');
    }

    return response.json();
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }

    return response.json();
  }
}