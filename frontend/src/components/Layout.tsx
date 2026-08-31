// Layout.tsx - ENHANCED WITH AUTHMANAGER INTEGRATION & IMPROVEMENTS
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Home, 
  BookOpen, 
  LogOut, 
  MessageCircle, 
  BarChart3,
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Settings,
  HelpCircle,
  UserCircle,
  Key,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Award,
  Crown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import NavigationMenu from './NavigationMenu';
import ExamMenu from './ExamMenu';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [studentGrade, setStudentGrade] = useState<string>('');
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const isPremium = user?.subscriptionStatus === 'Premium';
  const isGrade12 = studentGrade === 'HIG12A';
  const canAccessEslce = isPremium && isGrade12;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-menu-container')) {
          setUserMenuOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuOpen && themeMenuRef.current && !themeMenuRef.current.contains(event.target as HTMLElement)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [themeMenuOpen]);

  // Fetch student grade to gate Grade-12-only features (e.g. ESLCE)
  useEffect(() => {
    const fetchGrade = async () => {
      const token = localStorage.getItem('token');
      try {
        const gradeRes = await fetch(`${API_BASE}/api/study/student-grade`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          setStudentGrade(gradeData.grade || '');
        }
      } catch (e) {
        console.error('Failed to fetch student grade:', e);
      }
    };
    fetchGrade();
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/');
  };

  // Get user display name with fallbacks
  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split('@')[0];
    return 'Student';
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'S';
  };

  // Main navigation items - Organized and spacious
  interface MainNavItem {
    label: string;
    path: string;
    icon: typeof Home;
    component?: React.ReactNode;
    show: boolean;
    premiumOnly?: boolean;
    requiresGrade12?: boolean;
  }
  const mainNavItems: MainNavItem[] = [
    { 
      label: 'Dashboard', 
      path: '/dashboard', 
      icon: Home,
      show: true 
    },
    { 
      label: 'Study', 
      path: '#', 
      icon: BookOpen,
      component: <NavigationMenu target="study" />,
      show: true 
    },
    { 
      label: 'Exam', 
      path: '#', 
      icon: GraduationCap,
      component: <ExamMenu />,
      show: true 
    },
    { 
      label: 'Messages', 
      path: '/chat', 
      icon: MessageCircle,
      show: true 
    },
    { 
      label: 'Student Status', 
      path: '/student-status', 
      icon: BarChart3,
      show: true 
    },
    { 
      label: 'Report Card', 
      path: '/student-report', 
      icon: Award,
      show: true 
    },
    { 
      label: 'ESLCE Exams', 
      path: '/eslce', 
      icon: GraduationCap,
      show: true,
      premiumOnly: true,
      requiresGrade12: true
    },
  ];

  const isActive = (path: string) => {
    if (path === '#') return false;
    if (path === '/eslce') return location.pathname.startsWith('/eslce');
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation Bar - Redesigned for Spaciousness */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-lg shadow-md dark:bg-gray-900/90 dark:shadow-gray-800/50' 
          : 'bg-white shadow-md dark:bg-gray-900 dark:shadow-gray-800/50'
      }`}>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex justify-between items-center h-16 lg:h-16">
            
            {/* Logo - More prominent */}
            <Link to="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
<img
                src="/Logo.png"
                alt="MERP Student Assist Logo"
                className="h-10 w-10 object-contain rounded-lg"
              />
              <span className="font-bold text-lg text-gray-900 hidden xl:block">
                MERP Student Assist
              </span>
              {/* Premium badge - optional */}
              <span className="hidden xl:inline-block text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                <Sparkles className="w-3 h-3 inline mr-0.5" />
                Pro
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <div key={item.label}>
                  {item.component ? (
                    <div className="px-0.5">
                      {item.component}
                    </div>
                  ) : item.premiumOnly && !(item.requiresGrade12 ? canAccessEslce : isPremium) ? (
                    <span
                      className="group relative px-2.5 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                      <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded-full font-medium">Free</span>
                    </span>
                  ) : (
                    <Link
                      to={item.path}
                      className={`group relative px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isActive(item.path)
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-transform duration-200 ${
                        isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                      <span>{item.label}</span>
                      {(item).premiumOnly && (item.requiresGrade12 ? canAccessEslce : isPremium) && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded-full font-medium">Pro</span>
                      )}
                      {isActive(item.path) && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" />
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Right Section - User & Actions */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              
              {/* Search - Adds spacious feel */}
              <button className="hidden xl:flex p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications with badge */}
              <button className="relative p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              </button>

              {/* Upgrade / Pro Badge */}
              {!isPremium ? (
                <button
                  onClick={() => navigate('/payment')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade
                </button>
              ) : (
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold rounded-lg">
                  <Crown className="w-3 h-3" />
                  Pro
                </span>
              )}

              {/* Theme Toggle */}
              <div className="relative" ref={themeMenuRef}>
                <button
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Change theme"
                >
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </button>
                {themeMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <button onClick={() => { setTheme('light'); setThemeMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-3 transition-colors ${theme === 'light' ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <Sun className="w-4 h-4" /> Light
                    </button>
                    <button onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-3 transition-colors ${theme === 'dark' ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <Moon className="w-4 h-4" /> Dark
                    </button>
                    <button onClick={() => { setTheme('system'); setThemeMenuOpen(false); }}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-3 transition-colors ${theme === 'system' ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <Monitor className="w-4 h-4" /> System
                    </button>
                  </div>
                )}
              </div>

              {/* User Menu - Enhanced */}
              <div className="relative user-menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm relative">
                    {getUserInitials()}
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></span>
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {user?.role === 'admin' ? 'Administrator' : 'Student'}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* User Dropdown - Enhanced */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{getUserDisplayName()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'student@example.com'}</p>
                          <p className="text-xs text-indigo-600 font-medium">
                            {user?.role === 'admin' ? 'Administrator' : 'Student'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <UserCircle className="w-4 h-4" />
                      My Profile
                    </button>
                    
                    {/* ✅ NEW: Change Password Option */}
                   <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/change-password');  // This should now work
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Change Password
                    </button>
                                        
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/help');
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </button>
                    
                    {!isPremium && (
                      <button 
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/payment');
                        }}
                        className="w-full px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Upgrade to Premium
                      </button>
                    )}
                    
                    <hr className="my-1 dark:border-gray-700" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Full width with all items */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="max-w-8xl mx-auto px-4 py-3 space-y-1">
              {mainNavItems.map((item) => (
                <div key={item.label}>
                  {item.component ? (
                    <div className="px-2 py-2 border-b border-gray-50">
                      {item.component}
                    </div>
                  ) : item.premiumOnly && !(item.requiresGrade12 ? canAccessEslce : isPremium) ? (
                    <span
                      className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                      <span className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium">Free</span>
                    </span>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                      {(item).premiumOnly && (item.requiresGrade12 ? canAccessEslce : isPremium) && (
                        <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">Pro</span>
                      )}
                    </Link>
                  )}
                </div>
              ))}
              
              <hr className="my-2 dark:border-gray-700" />
              
              {/* Mobile user info */}
              <div className="px-4 py-2 flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                  {getUserInitials()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'student@example.com'}</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <UserCircle className="w-5 h-5" />
                Profile
              </button>
              
              {/* ✅ NEW: Change Password in mobile menu */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/change-password');
                }}
                className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Key className="w-5 h-5" />
                Change Password
              </button>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;