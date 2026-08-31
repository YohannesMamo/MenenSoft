import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import {
  Crown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCircle,
  Key,
} from 'lucide-react';

const TABS = [
  { id: 'plan', label: 'Plan & Billing', icon: Crown },
  { id: 'account', label: 'Account', icon: UserCircle },
  { id: 'security', label: 'Security', icon: Key },
];

const FEATURES = [
  { name: 'ESLCE Practice Exams', free: false, premium: true },
  { name: 'Advanced Performance Analytics', free: false, premium: true },
  { name: 'Personalized Study Plans', free: false, premium: true },
  { name: 'Priority Support', free: false, premium: true },
  { name: 'Interactive Textbooks', free: true, premium: true },
  { name: 'Quizzes & Practice', free: true, premium: true },
  { name: 'Exam Sessions', free: true, premium: true },
  { name: 'Chat & Collaboration', free: true, premium: true },
];

const PlanBilling = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscriptionStatus === 'Premium';
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your Premium subscription? You will lose access to Premium features.')) return;
    setCancelling(true);
    setCancelMessage('');
    try {
      const res = await apiFetch('/api/payments/subscription/cancel', { method: 'POST' });
      if (res.ok) {
        localStorage.setItem('subscriptionStatus', 'Free');
        refreshUser();
        setCancelMessage('Subscription cancelled. You are now on the Free plan.');
      } else {
        const data = await res.json();
        setCancelMessage(data.detail || 'Failed to cancel subscription.');
      }
    } catch {
      setCancelMessage('Network error. Please try again.');
    }
    setCancelling(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className={`rounded-2xl p-6 ${isPremium ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremium ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Crown className={`w-5 h-5 ${isPremium ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isPremium ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {isPremium ? 'Premium Plan' : 'Free Plan'}
              </h3>
              <p className={`text-sm ${isPremium ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {isPremium ? 'Lifetime access • No renewal needed' : 'Basic access to learning tools'}
              </p>
            </div>
          </div>
          {!isPremium && (
            <button
              onClick={() => navigate('/payment')}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Crown className="w-4 h-4" />
              Upgrade
            </button>
          )}
        </div>

        {isPremium && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-indigo-100 mb-3">Your Premium subscription includes:</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.filter(f => f.premium && !f.free).map(f => (
                <div key={f.name} className="flex items-center gap-2 text-sm text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-green-300 flex-shrink-0" />
                  {f.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feature Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Feature Comparison</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="grid grid-cols-3 px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Premium</span>
          </div>
          {FEATURES.map((feature) => (
            <div key={feature.name} className="grid grid-cols-3 px-6 py-3 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
              <span className="text-center">
                {feature.free ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </span>
              <span className="text-center">
                {feature.premium ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Subscription */}
      {isPremium && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cancel Subscription</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You will lose access to Premium features including ESLCE practice and advanced analytics.
          </p>
          {cancelMessage && (
            <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${cancelMessage.includes('cancelled') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
              {cancelMessage.includes('cancelled') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {cancelMessage}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('plan');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' && <PlanBilling />}
      {activeTab === 'account' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          Account settings coming soon.
        </div>
      )}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
          Security settings coming soon.
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
