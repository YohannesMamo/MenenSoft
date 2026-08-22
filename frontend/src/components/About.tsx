// pages/About.tsx - COMPLETE SELF-CONTAINED PAGE WITH NAVIGATION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  Clock, 
  Send, 
  CheckCircle,
  Target,
  Heart,
  Globe,
  Building2,
  BookOpen,
  Home,
  User,
  Menu,
  X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const About: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to send message.');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSuccess(false), 5000);
      
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation items
  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'About', path: '/about', icon: User },
    { label: 'Contact', path: '/about#contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                MERP Student Assist
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path.includes('#')) {
                      // Handle anchor links
                      const section = item.path.split('#')[1];
                      const element = document.getElementById(section);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              
              {/* Auth Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-indigo-100 transition-all duration-200"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 py-2">
            <div className="max-w-7xl mx-auto px-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (item.path.includes('#')) {
                      const section = item.path.split('#')[1];
                      const element = document.getElementById(section);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 flex items-center gap-3 text-sm font-medium"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors text-sm font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              About{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                MERP Student Assist
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Empowering Ethiopian students to achieve academic excellence through innovative, 
              AI-powered learning solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors hover:shadow-lg">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Our Mission</h3>
              <p className="text-gray-600 dark:text-gray-400">
                To make quality education accessible to every Ethiopian student through technology 
                and innovation.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors hover:shadow-lg">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Our Vision</h3>
              <p className="text-gray-600 dark:text-gray-400">
                A future where every Ethiopian student can reach their full potential with 
                personalized learning.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors hover:shadow-lg">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Our Values</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Innovation, accessibility, community, and excellence in everything we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900" id="contact">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Get In Touch</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Have questions? We'd love to hear from you. Reach out to us through any of the channels below.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Address</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Bole Road, Addis Ababa<br />Ethiopia</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Email</p>
                      <a href="mailto:calebbenyofoni2@gmail.com" className="text-gray-600 dark:text-gray-400 text-sm hover:text-indigo-600 transition-colors">
                        calebbenyofoni2@gmail.com
                      </a>
                      <br />
                      <a href="mailto:calebbenyofoni2@gmail.com" className="text-gray-600 dark:text-gray-400 text-sm hover:text-indigo-600 transition-colors">
                        taddele@atomicmail.io
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Phone</p>
                      <a href="tel:+251977815579" className="text-gray-600 dark:text-gray-400 text-sm hover:text-indigo-600 transition-colors">
                        +251 977 815 579
                      </a>
                      <br />
                      <a href="tel:+251913067854" className="text-gray-600 dark:text-gray-400 text-sm hover:text-indigo-600 transition-colors">
                        +251 913 067 854
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Working Hours</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Monday - Friday: 8:00 AM - 6:00 PM</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Saturday: 9:00 AM - 2:00 PM</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Follow Us</h3>
                <div className="flex gap-3 flex-wrap">
                  <a 
                    href="https://facebook.com/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#1877F2] rounded-xl flex items-center justify-center hover:bg-[#1877F2]/80 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    f
                  </a>
                  <a 
                    href="https://twitter.com/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#000000] rounded-xl flex items-center justify-center hover:bg-[#000000]/80 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    𝕏
                  </a>
                  <a 
                    href="https://instagram.com/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-xl flex items-center justify-center hover:opacity-90 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    📷
                  </a>
                  <a 
                    href="https://youtube.com/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#FF0000] rounded-xl flex items-center justify-center hover:bg-[#FF0000]/80 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    ▶
                  </a>
                  <a 
                    href="https://linkedin.com/company/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#0A66C2] rounded-xl flex items-center justify-center hover:bg-[#0A66C2]/80 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    in
                  </a>
                  <a 
                    href="https://t.me/MERPassist" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#0088CC] rounded-xl flex items-center justify-center hover:bg-[#0088CC]/80 transition-colors shadow-lg hover:shadow-xl text-white font-bold text-xl"
                  >
                    ✈
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Send Us a Message</h3>
                
                {success && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Message sent successfully! We'll get back to you soon.</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="What is this regarding?"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-indigo-900/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Find Us</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Visit our office in Addis Ababa
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="relative h-80 bg-gray-200 dark:bg-gray-700">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126186.42278338995!2d38.697551999999996!3d9.008392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85cef5ab402d%3A0x8467b6b037a24d49!2sAddis%20Ababa%2C%20Ethiopia!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="MERP Student Assist Office Location"
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Start Learning?</h2>
          <p className="mt-4 text-lg text-white/80">
            Join thousands of students who are already acing their exams with MERP Student Assist
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 px-8 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2"
          >
            Get Started Free
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} MERP Student Assist. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;