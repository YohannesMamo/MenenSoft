import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Building2,
  Shield,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';

const PLANS = [
  {
    id: 'yearly',
    label: 'Yearly',
    price: '1,000',
    perMonth: '~83/mo',
    badge: 'Best Value',
    recommended: true,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '100',
    perMonth: '100/mo',
    badge: null,
    recommended: false,
  },
];

const PaymentPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const isPremium = user?.subscriptionStatus === 'Premium';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = async () => {
    if (!reference.trim()) return;
    setStatus('verifying');
    setMessage('');
    setPaymentData(null);

    try {
      const res = await apiFetch('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: reference.trim(), plan: selectedPlan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.detail || 'Payment verification failed');
        return;
      }

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Payment verified! Welcome to Premium.');
        setPaymentData(data);
        localStorage.setItem('subscriptionStatus', 'Premium');
        refreshUser();
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed. Please try again.');
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
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're Premium!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have lifetime access to all Premium features including ESLCE practice and advanced analytics.
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

        {/* Plan Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
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

        {/* Payment Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            How to Pay
          </h3>

          <div className="space-y-4">
            {/* Telebirr */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-sm">Telebirr</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Send <strong>{selectedPlan === 'yearly' ? '1,000' : '100'} ETB</strong> via Telebirr
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm font-mono text-gray-900 dark:text-white">
                    0912345678
                  </code>
                  <button
                    onClick={() => handleCopy('0912345678', 'telebirr')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    {copied === 'telebirr' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Name: <strong>Yohannes Mamo</strong>
                  <button
                    onClick={() => handleCopy('Yohannes Mamo', 'name')}
                    className="ml-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors inline-flex"
                  >
                    {copied === 'name' ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* CBE */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-sm">CBE (Commercial Bank of Ethiopia)</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Send <strong>{selectedPlan === 'yearly' ? '1,000' : '100'} ETB</strong> via CBE
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm font-mono text-gray-900 dark:text-white">
                    1000123456789
                  </code>
                  <button
                    onClick={() => handleCopy('1000123456789', 'cbe')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    {copied === 'cbe' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Name: <strong>Yohannes Mamo</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Input */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Enter Payment Reference
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            After sending payment, enter the transaction reference number shown in your receipt.
          </p>
          <input
            type="text"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value.toUpperCase());
              if (status !== 'idle') {
                setStatus('idle');
                setMessage('');
                setPaymentData(null);
              }
            }}
            placeholder="e.g. CJU5RZ5NM3"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-lg tracking-wider placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            disabled={status === 'verifying'}
          />
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-medium ${
                  status === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {message}
              </p>
              {status === 'success' && paymentData?.payerName && (
                <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                  Verified from: {paymentData.payerName}
                </p>
              )}
              {status === 'success' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-3 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue to Dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={!reference.trim() || status === 'verifying'}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {status === 'verifying' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying Payment...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Verify Payment
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Your subscription is activated instantly after verification. Lifetime access.
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
