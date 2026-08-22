// pages/LandingPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  BookOpen, 
  Users, 
  Star,
  Menu,
  X,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Sparkles
} from 'lucide-react';


const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Interactive Textbooks',
      description: 'Engaging digital textbooks with interactive elements that make learning more effective and enjoyable.'
    },
    
    {
      icon: Target,
      title: 'Exam Preparation',
      description: 'Comprehensive exam preparation with past papers, mock tests, and performance analytics.'
    },
    {
      icon: Target,
      title: 'ESLCE/Matriculation',
      description: 'ESLCE exam preparation with past exams and predictions. Scientific predictive techniques are used to predict the years ESLCE questions.'
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Detailed analytics and insights to track your academic progress and identify areas for improvement.'
    },
    {
      icon: Users,
      title: 'Community Support',
      description: 'Connect with fellow students, share knowledge, and learn together in a supportive environment.'
    },
    {
      icon: Users,
      title: 'And more ..........',
      
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-50 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/Menen Student assist Logo.png"
                alt="MERP Student Assist Logo"
                className="h-9 w-9 object-contain rounded-xl"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                MERP Student Assist
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#plans" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Plans
              </a>
              <button 
    onClick={() => navigate('/about')} 
    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
  >
    About
  </button>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200"
              >
                Sign up free
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 p-4">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Features</a>
              <a href="#plans" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Plans</a>
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">About</a>
              <hr className="border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/login');
                }}
                className="text-indigo-600 font-medium py-2"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/register');
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-2 rounded-lg"
              >
                Sign up free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm text-indigo-700 dark:text-indigo-300 mb-6">
                <Sparkles className="w-4 h-4" />
                <span>🎓 Empowering Ethiopian students since 2024</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Ace Your Exams with{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AI-Powered
                </span>
                <br />
                Learning
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
                Master the ESLCE with interactive textbooks, past exam papers, and AI-generated practice questions. Your personal academic assistant for exam success.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-indigo-100 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Get started free
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-indigo-600 hover:text-indigo-600 transition-all duration-200"
                >
                  Log in
                </button>
              </div>

              {/* Stats
              <div className="mt-12 flex items-center gap-8">
                <div>
                  <div className="text-2xl font-bold text-gray-900">5K+</div>
                  <div className="text-sm text-gray-500">Active Students</div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">100+</div>
                  <div className="text-sm text-gray-500">Past Exams</div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">96%</div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
              </div> */}
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/Students1.png"  // Fixed the filename (Studeents → Students)
                alt="Students"
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-purple-600/10" />
            </div>
              
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex items-center gap-3 animate-bounce">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Exam Ready</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Past papers + AI practice</div>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">AI Powered</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Smart recommendations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm text-indigo-700 dark:text-indigo-300 mb-4">
              <Star className="w-4 h-4" />
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Succeed
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Comprehensive tools and resources designed specifically for ESLCE exam preparation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-xl transition-all duration-200"
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                  <feature.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section - Replacing Testimonials */}
      <section id="plans" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-sm text-indigo-700 dark:text-indigo-300 mb-4">
              <Zap className="w-4 h-4" />
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Learning Plan
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Start free and upgrade when you're ready for full exam preparation
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-3xl p-8 bg-white dark:bg-gray-900 hover:shadow-xl transition-all duration-200">
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-2 text-sm tracking-wider">FREE</div>
              <h3 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Basic Study</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Perfect for getting started</p>
              
              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Interactive Textbooks</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Section Quizzes + Evaluation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Progress Tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Basic Performance Analytics</span>
                </li>
              </ul>

              <div className="mt-8 mb-6">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">/ month</span>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Start Free Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Premium Plan */}
            <div className="border-2 border-indigo-600 rounded-3xl p-8 bg-white dark:bg-gray-900 relative hover:shadow-xl transition-all duration-200">
              <div className="absolute -top-4 right-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-lg">
                RECOMMENDED
              </div>
              <div className="text-indigo-600 dark:text-indigo-400 font-semibold mb-2 text-sm tracking-wider">PREMIUM</div>
              <h3 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">ESLCE Master</h3>
              <p className="text-indigo-600 dark:text-indigo-400 mb-6">Full Exam Preparation</p>

              <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Past ESLCE Exams with Answers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>AI Projected Exam Questions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Advanced Performance Analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Personalized Study Plans</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <span>Priority Support</span>
                </li>
              </ul>

              <div className="mt-8 mb-6">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">Coming soon !</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2"></span>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">(Uner finalization)</p>
              </div>

              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Upgrade to Premium
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All plans include free updates and 24/7 support. <br className="sm:hidden" />
              <button 
                onClick={() => navigate('/register')}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Create your free account →
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Ace Your Exams?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Join thousands of students who are preparing smarter for their ESLCE exams with MERP Student Assist
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-xl hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2"
          >
            Create free account
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="mt-4 text-sm text-white/60">
            No credit card required. Free plan includes all basic features.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2">
                <img
                  src="/Menen Student assist Logo.png"
                  alt="MERP Student Assist Logo"
                  className="h-8 w-8 object-contain rounded-lg"
                />
                <span className="text-xl font-bold text-white">MERP Student Assist</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed">
                Empowering Ethiopian students to achieve academic excellence through AI-powered learning and exam preparation.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#plans" className="hover:text-white transition-colors">Plans</a></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Login</button></li>
                <li><button onClick={() => navigate('/register')} className="hover:text-white transition-colors">Sign Up</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
            © 2024 MERP Student Assist. All rights reserved. Made with ❤️ for Ethiopian students.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;