//const API_BASE = '/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    const response = await fetch(`${API_BASE}/api/auth/login`, {
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
    const response = await fetch(`${API_BASE}/api/auth/register`, {
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
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to get profile');
    }
    return response.json();
  },
};