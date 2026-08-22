// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
 
  userId: string;
  email: string;
  role: string;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  isProfileComplete?: boolean;
  subscriptionStatus?: string; 
}

interface AuthContextType {
   token:string;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const loadUserFromStorage = () => {
    const storedToken = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    const studentId = localStorage.getItem('studentId');
    const firstName = localStorage.getItem('userName');
	const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    if (storedToken && userId) {
      setToken(storedToken);
      setUser({
        userId,
        email: userEmail || '',
        role: userRole || 'Student',
        studentId: studentId || undefined,
        firstName: firstName || undefined,
		subscriptionStatus: subscriptionStatus || 'Free'
      });
      return true;
    }
    setUser(null);
    setToken(null);
    return false;
  };

  useEffect(() => {
    loadUserFromStorage();
    setLoading(false);
  }, []);

  const AUTH_KEYS = ['token', 'userId', 'userEmail', 'userRole', 'studentId', 'userName', 'subscriptionStatus'];

  const login = (newToken: string, userData: User) => {
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userRole', userData.role);
    if (userData.studentId) {
      localStorage.setItem('studentId', userData.studentId);
    }
    if (userData.firstName) {
      localStorage.setItem('userName', userData.firstName);
    }
    if (userData.subscriptionStatus) {
      localStorage.setItem('subscriptionStatus', userData.subscriptionStatus);
    }
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    setToken(null);
    setUser(null);
  };

  const refreshUser = () => {
    loadUserFromStorage();
  };

  return (
    <AuthContext.Provider value={{
      token: token || '',
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};