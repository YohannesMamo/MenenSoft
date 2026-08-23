import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Crown,
  Smartphone,
  Building2,
} from 'lucide-react';

const PLANS = [
  {
    id: 'yearly',
    label: 'Yearly',
    price: '1,000',
    perMonth: '~83/mo',
    badge: 'Best Value',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '100',
    perMonth: '100/mo',
    badge: null,
  },
];

const FEATURES = [
  'ESLCE Practice Exams',
  'Advanced Performance Analytics',
  'Personalized Study Plans',
  'Priority Support',
];

const PaymentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isPremium = user?.subscriptionStatus === 'Premium';
  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan);

  const handlePay = async (provider: string) => {
    setStatus('redirecting');
    setMessage('');

    try {
      const res = await apiFetch('/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          plan: selectedPlan,
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.detail || 'Failed to initiate payment');
        return;
      }

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setStatus('error');
        setMessage('No payment URL received. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Network error. Please check your connection.');
    }
  };

  if (isPremium) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're Premium!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have lifetime access to all Premium features.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upgrade to Premium</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Unlock ESLCE practice, advanced analytics, and all exam features.
          </p>
        </div>

        {/* Step 1: Plan Selection */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            1. Choose your plan
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                  selectedPlan === plan.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{plan.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">ETB</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{plan.perMonth}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Phone Number (optional) */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            2. Phone number <span className="normal-case">(optional)</span>
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="09XXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Enter the phone number linked to your Telebirr or CBE Birr account.
            </p>
          </div>
        </div>

        {/* Step 3: Pay */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            3. Select payment method
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => handlePay('telebirr')}
              disabled={status === 'redirecting'}
              className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white text-lg">Telebirr</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Pay {selectedPlanData?.price} ETB with Ethio Telecom mobile money
                </div>
              </div>
              {status === 'redirecting' ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
                  &rarr;
                </span>
              )}
            </button>

            <button
              onClick={() => handlePay('cbe')}
              disabled={status === 'redirecting'}
              className="w-full flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white text-lg">CBE Birr</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Pay {selectedPlanData?.price} ETB with CBE Birr
                </div>
              </div>
              {status === 'redirecting' ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <span className="text-gray-400 group-hover:text-green-500 transition-colors">
                  &rarr;
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {status === 'error' && message && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">{message}</p>
              <button
                onClick={() => { setStatus('idle'); setMessage(''); }}
                className="text-sm text-red-600 dark:text-red-400 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Premium includes</h3>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          You will be redirected to complete payment. Subscription activates after confirmation. Lifetime access.
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
