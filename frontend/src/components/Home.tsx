import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Clock, Users, ArrowRight, User } from 'lucide-react';
const API_BASE = import.meta.env.VITE_API_URL || '/api'
interface UserType {
  id: string;
  name: string;
  profileCompleted?: boolean;
}

const Home: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser: UserType = JSON.parse(savedUser);
      setUser(parsedUser);

      // Check if profile is already completed in DB
      const checkProfile = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/student-info/${parsedUser.id}`);
          if (response.ok) {
            setUser(prev => prev ? { ...prev, profileCompleted: true } : null);
          }
        } catch (err) {
          console.error('Error checking profile:', err);
        }
      };
      checkProfile();
    }
  }, []);

  const features = [
    { icon: BookOpen, title: 'Smart Study Plans', desc: 'AI-powered study schedules tailored to your course load.' },
    { icon: Clock, title: 'Exam Countdown', desc: 'Never miss a deadline with our automated exam trackers.' },
    { icon: Users, title: 'Peer Support', desc: 'Connect with fellow students and share resources instantly.' },
    { icon: Sparkles, title: 'AI Tutoring', desc: 'Get instant answers to your complex academic questions.' },
  ];

  return (
    <div className="max-w-4xl w-full text-center py-12">
      <div className="mb-16">
        {user ? (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Welcome back, {user.name}!
          </div>
        ) : null}
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
          Your Personal <span className="text-indigo-600 dark:text-indigo-400">Academic Companion</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          MERP Student Assist helps you organize your study life, track your progress, and excel in your exams with AI-powered insights.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/student-registration"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-10 py-4 rounded-2xl font-bold text-lg border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {user.profileCompleted ? 'Profile' : 'Complete Profile'}
                </Link>
              </div>
              
              {!user.profileCompleted && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl max-w-md animate-bounce">
                  <p className="text-amber-800 dark:text-amber-300 text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Don't forget to complete your profile to unlock all features!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-10 py-4 rounded-2xl font-bold text-lg border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {features.map((feature, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
