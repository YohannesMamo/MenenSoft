import { resolveApiBase } from '../config/api';

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface RegisterRequest {
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  DateOfBirth?: string;
  Email: string;
  Password: string;
  PhoneMobile?: string;
  GradeId?: string;
}

export interface AuthResponse {
  message: string;
  studentId?: string;
  token: string;
}

export interface ProfileResponse {
  email: string;
  role: string;
  student: {
    StudentID: string;
    StuFirstName: string;
    StuMiddleName?: string;
    StuLastName: string;
    StuDateOfBirth: string;
    StuPhoneMobile?: string;
    StuPhoneResidence?: string;
    StuWebAddress?: string;
    StuAddress?: string;
    StuGrade: string;
    StuGender?: string;
    StuStatus?: string;
  } | null;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    return response.json();
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    return response.json();
  },

  getProfile: async (token: string): Promise<ProfileResponse> => {
    const base = await resolveApiBase();
    const response = await fetch(`${base}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to get profile');
    }
    return response.json();
  },
};