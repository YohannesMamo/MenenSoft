// AuthManager.tsx - UPDATED TO USE SEPARATE MODAL
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  CheckCircle, 
  UserPlus, 
  Key, 
  Eye,
  EyeOff,
  Phone,
  BookOpen,
  Trophy,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal'; // ✅ Import the separate modal

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Grade {
  gradeId: string;
  gradeDescription: string;
}

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';

const AuthManager: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial view based on the URL path
  const getInitialView = (): AuthView => {
    const path = location.pathname;
    if (path.includes('register')) return 'register';
    if (path.includes('forgot-password')) return 'forgot-password';
    if (path.includes('reset-password')) return 'reset-password';
    if (path.includes('verify-email')) return 'verify-email';
    return 'login';
  };

  const [view, setView] = useState<AuthView>(getInitialView());
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // ✅ Modal state - just a boolean
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Registration additional fields
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phoneMobile: '',
    gradeId: '',
    dateOfBirth: '',
    gender: ''
  });

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const verificationRequestRef = useRef<string | null>(null);

  // Extract URL parameters
  const queryParams = new URLSearchParams(location.search);
  const URLToken = queryParams.get('token') || '';

  // ✅ DETECT CHANGE PASSWORD ROUTE - SIMPLIFIED
  useEffect(() => {
    const currentView = getInitialView();
    setView(currentView);
    
    // Auto-show change password modal when on /change-password
    if (location.pathname === '/change-password') {
      setShowChangePassword(true);
    }
    
    setError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
  }, [location.pathname]);

  // Load grades for registration
  useEffect(() => {
    if (view !== 'register') return;

    const fetchGrades = async () => {
      setLoadingGrades(true);
      try {
        const response = await fetch(`${API_BASE}/api/students/grades`);
        if (!response.ok) throw new Error(`Failed to fetch grades: ${response.status}`);
        const data = await response.json();
        setGrades(data || []);
        if (data?.length > 0) {
          setRegisterForm(prev => ({ ...prev, gradeId: data[0].gradeId }));
        }
      } catch (err: any) {
        setError('Could not load academic grades. Please refresh the page.');
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, [view]);

  // Auto-run email verification
  useEffect(() => {
    const isVerifyRoute = location.pathname.includes('verify-email');

    if (!isVerifyRoute) {
      verificationRequestRef.current = null;
      return;
    }

    if (!URLToken) {
      setError('Missing verification token in security URL link.');
      return;
    }

    if (verificationRequestRef.current === URLToken) {
      return;
    }

    verificationRequestRef.current = URLToken;
    handleEmailVerification(URLToken);
  }, [location.pathname, URLToken]);

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const getResponseData = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  // 1. LOGIN CONTROLLER
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email.trim(), Password: password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Login authentication failed');
      }

      if (!data.isVerified) {
        setError('Please verify your email before logging in. Check your inbox for the link.');
        setLoading(false);
        return;
      }

      login(data.token, {
        userId: data.userId,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        firstName: data.firstName,
        isProfileComplete: data.isProfileComplete,
        subscriptionStatus: data.subscriptionStatus 
      });

      navigate(data.isProfileComplete ? '/dashboard' : '/complete-profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. REGISTRATION CONTROLLER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!registerForm.firstName.trim() || !registerForm.lastName.trim() || !email || !password || !registerForm.gender || !registerForm.dateOfBirth || !registerForm.gradeId) {
      setError("All required fields (*) must be filled out");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!agreeToTerms) {
      setError("You must agree to the Terms and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        Email: email.trim(),
        Password: password,
        FirstName: registerForm.firstName.trim(),
        MiddleName: registerForm.middleName.trim(),
        LastName: registerForm.lastName.trim(),
        PhoneMobile: registerForm.phoneMobile.trim(),
        GradeId: registerForm.gradeId,
        DateOfBirth: registerForm.dateOfBirth,
        Gender: registerForm.gender
      };

      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(data.detail || data.message || data.error || 'Registration failed');
      }

      setSuccessMessage(data.message || 'Registration successful! Please check your inbox for verification link.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. FORGOT PASSWORD CONTROLLER
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email.trim() })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Failed to send reset link');
      
      setSuccessMessage(data.message || 'If this account exists, a reset link has been dispatched to your email.');
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. RESET PASSWORD CONTROLLER
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!URLToken) {
      setError('Missing password recovery verification token.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Token: URLToken, NewPassword: newPassword })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Failed to update user security credentials.');

      setSuccessMessage('Password updated successfully! Redirecting to login view...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. EMAIL VERIFICATION CONTROLLER
  const handleEmailVerification = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-email?token=${token}`, { method: 'GET' });
      const data = await getResponseData(response);
      const backendMessage = data.message || data.detail || data.error || '';
      const isAlreadyVerified = /already verified|verified successfully|can now log in/i.test(backendMessage);

      if (!response.ok && !isAlreadyVerified) {
        throw new Error(backendMessage || 'Email verification link expired or invalid.');
      }

      setSuccessMessage(backendMessage || 'Your email has been successfully verified! You can now log in.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle modal close
  const handleModalClose = () => {
    setShowChangePassword(false);
    navigate('/dashboard');
  };

  // Main render
  return (
    <>
      <div className="min-h-screen flex overflow-hidden">
        {/* LEFT SIDE - STUDENT ASSIST PROMO */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 relative overflow-hidden items-center justify-center">
          
           {/* Background Image */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: "url('students4.jpg')", 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}></div>
          
          <div className="absolute inset-0 bg-[radial-gradient(at_40%_30%,rgba(255,255,255,0.15)_0%,transparent_60%)]"></div>
          
          <div className="relative z-10 max-w-md text-white p-10">
          <div className="flex justify-center mb-8">
  <img
    src="/Logo.png"
    alt="MERP Student Assist Logo"
    className="w-48 h-48 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]"
  />
</div>

            <h1 className="text-5xl font-bold text-center mb-4 leading-tight">
              Empowering Students<br />to Excel
            </h1>
            <p className="text-xl text-indigo-100 text-center mb-12">
              Your all-in-one academic companion — AI tools, progress tracking, and personalized learning.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5">
                <BookOpen className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Smart Study Resources</h3>
                  <p className="text-indigo-100 text-sm">Grade-specific notes, quizzes &amp; summaries</p>
                </div>
              </div>

              <div className="flex gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5">
                <Trophy className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Track Your Growth</h3>
                  <p className="text-indigo-100 text-sm">Real-time performance analytics &amp; goals</p>
                </div>
              </div>

              <div className="flex gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-5">
                <Target className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Interactive Quizzes and Exams</h3>
                  <p className="text-indigo-100 text-sm">Full answers with explanations</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12 text-sm opacity-75">
              Trusted by thousands of Ethiopian students
            </div>
          </div>

          {/* Decorative floating elements */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 border border-white/20 rounded-full"></div>
          <div className="absolute top-20 -left-10 w-40 h-40 border border-white/10 rounded-full"></div>
        </div>

        {/* RIGHT SIDE - AUTH FORM */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 pt-1 pb-8">
          <div className="bg-white dark:bg-gray-800 px-8 pb-8 rounded-2xl shadow-xl dark:shadow-gray-900 w-full max-w-md border border-gray-100 dark:border-gray-700">
            
            {/* Logo */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <div className="rounded-2xl">
                  <img
                    src="/Menen Student assist Logo.png"
                    alt="MERP Student Assist Logo"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              </div>
             
            </div>

            {/* SHARED HEADER */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {view === 'login' && 'Welcome Back'}
                {view === 'register' && 'Create Account'}
                {view === 'forgot-password' && 'Reset Password'}
                {view === 'reset-password' && 'Set New Password'}
                {view === 'verify-email' && 'Email Verification'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {view === 'login' && 'Login to your MERP Student Assist account'}
                {view === 'register' && 'Join MERP Student Assist today'}
                {view === 'forgot-password' && 'Enter your account email to receive a secure link'}
                {view === 'reset-password' && 'Create your new password'}
                {view === 'verify-email' && 'Validating your email address'}
              </p>
            </div>

            {/* NOTIFICATION BANNERS */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 rounded-xl text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. LOGIN VIEW */}
            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="name@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-950 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* 2. REGISTRATION VIEW */}
            {view === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      name="firstName"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="First"
                      value={registerForm.firstName}
                      onChange={handleRegisterChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      name="lastName"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Last"
                      value={registerForm.lastName}
                      onChange={handleRegisterChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Middle name (optional)"
                    value={registerForm.middleName}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="name@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
                    <select
                      required
                      name="gender"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={registerForm.gender}
                      onChange={handleRegisterChange}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      name="dateOfBirth"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={registerForm.dateOfBirth}
                      onChange={handleRegisterChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="tel"
                      name="phoneMobile"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="09XX XXX XXX"
                      value={registerForm.phoneMobile}
                      onChange={handleRegisterChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade Level *</label>
                  <select
                    required
                    name="gradeId"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={registerForm.gradeId}
                    onChange={handleRegisterChange}
                  >
                    {loadingGrades ? (
                      <option>Loading grades...</option>
                    ) : (
                      grades.map(g => (
                        <option key={g.gradeId} value={g.gradeId}>
                          {g.gradeDescription}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={e => setAgreeToTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 mt-1"
                    required                  />
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || loadingGrades}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-950 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* 3. FORGOT PASSWORD VIEW */}
            {view === 'forgot-password' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-950 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Remember password?{' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    Back to Sign In
                  </button>
                </p>
              </form>
            )}

            {/* 4. RESET PASSWORD VIEW */}
            {view === 'reset-password' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!!confirmPassword && newPassword !== confirmPassword)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-950 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 5. EMAIL VERIFICATION VIEW */}
            {view === 'verify-email' && (
              <div className="text-center py-6">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
                  </div>
                ) : (
                  <>
                    {successMessage ? (
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                        {successMessage}
                      </div>
                    ) : error ? (
                      <div className="text-red-600 dark:text-red-400 font-medium">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                        {error}
                        <button
                          onClick={() => setView('login')}
                          className="mt-4 block w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all"
                        >
                          Back to Login
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Click below to try again</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="inline-flex bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all items-center gap-2"
                        >
                          Retry Verification
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Change Password Modal - Isolated component */}
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={handleModalClose} 
      />
    </>
  );
};

export default AuthManager;