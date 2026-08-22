// types/auth.types.ts
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  agreeTerms: boolean;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  isProfileComplete: boolean;
}

export interface User {
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  isProfileComplete: boolean;
}