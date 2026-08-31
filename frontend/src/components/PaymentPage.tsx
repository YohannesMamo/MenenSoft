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
  CreditCard,
  Shield,
  Copy,
  Check,
} from 'lucide-react';

const PLANS = [
  { id: 'yearly', label: 'Yearly', price: '1,550', priceNum: 1550, badge: 'Best Value' },
  { id: 'monthly', label: 'Monthly', price: 'See Yearly', priceNum: 'See Yearly', badge: null },
];

const PaymentPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const [telebirrPhone, setTelebirrPhone] = useState('0977815579');
  const [telebirrName, setTelebirrName] = useState('Menen Amare');
  const [cbeAccount, setCbeAccount] = useState('1000123456789');
  const [cbeName, setCbeName] = useState('Menen Amare');

  const isPremium = user?.subscriptionStatus === 'Premium';
  const plan = PLANS.find((p) => p.id === selectedPlan);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
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
        setMessage(data.detail || 'Verification failed');
        return;
      }

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Welcome to Premium!');
        setPaymentData(data);
        localStorage.setItem('subscriptionStatus', 'Premium');
        refreshUser();
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Network error');
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
          <p className="text-gray-600 dark:text-gray-400 mb-6">Lifetime access to all Premium features.</p>
          <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upgrade to Premium</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Pay externally, then verify your payment here.</p>

        {/* 1. Choose Plan */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">1. Choose your plan</h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`relative p-5 rounded-2xl border-2 text-left transition-all ${selectedPlan === p.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'}`}>
                {p.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">{p.badge}</span>}
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{p.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{p.price}</span>
                  <span className="text-sm text-gray-500">ETB</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. How to Pay */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">2. How to Pay</h2>

          {/* Telebirr */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Telebirr</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Send <strong>{plan?.price} ETB</strong> via Telebirr
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={telebirrPhone}
                  onChange={(e) => setTelebirrPhone(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button onClick={() => copyToClipboard(telebirrPhone, 'phone')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Copy">
                  {copied === 'phone' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <input
                  type="text"
                  value={telebirrName}
                  onChange={(e) => setTelebirrName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* CBE */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">CBE (Commercial Bank of Ethiopia)</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Send <strong>{plan?.price} ETB</strong> via CBE
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cbeAccount}
                  onChange={(e) => setCbeAccount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button onClick={() => copyToClipboard(cbeAccount, 'account')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Copy">
                  {copied === 'account' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <input
                  type="text"
                  value={cbeName}
                  onChange={(e) => setCbeName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Enter reference */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" /> 3. Verify your payment
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            After paying, enter the transaction reference from your payment receipt.
          </p>
          <input
            type="text"
            value={reference}
            onChange={(e) => { setReference(e.target.value.toUpperCase()); if (status !== 'idle') { setStatus('idle'); setMessage(''); setPaymentData(null); } }}
            placeholder="e.g. CJU5RZ5NM3"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-lg tracking-wider placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            disabled={status === 'verifying'}
          />
        </div>

        {/* Status */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            {status === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={`font-medium ${status === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{message}</p>
              {status === 'success' && paymentData?.payerName && <p className="text-sm text-green-600 dark:text-green-300 mt-1">Verified from: {paymentData.payerName}</p>}
              {status === 'success' && (
                <button onClick={() => navigate('/dashboard')} className="mt-3 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  Continue to Dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verify button */}
        <button onClick={handleVerify} disabled={!reference.trim() || status === 'verifying'} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
          {status === 'verifying' ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : <><CheckCircle2 className="w-5 h-5" /> Verify Payment</>}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">Subscription activates after verification. Lifetime access.</p>
      </div>
    </div>
  );
};

export default PaymentPage;
