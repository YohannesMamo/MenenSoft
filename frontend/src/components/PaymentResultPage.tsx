import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const PaymentResultPage = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [reference, setReference] = useState('');

  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('orderId') || searchParams.get('outTradeNo') || '';
    const txStatus = searchParams.get('status') || searchParams.get('code') || '';

    setReference(ref);

    if (ref) {
      apiFetch(`/api/payments/status/${ref}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'verified') {
            localStorage.setItem('subscriptionStatus', 'Premium');
            refreshUser();
            setStatus('success');
          } else if (data.status === 'failed') {
            setStatus('failed');
          } else if (data.status === 'pending') {
            setTimeout(() => {
              apiFetch(`/api/payments/status/${ref}`)
                .then((r) => r.json())
                .then((data2) => {
                  if (data2.status === 'verified') {
                    localStorage.setItem('subscriptionStatus', 'Premium');
                    refreshUser();
                    setStatus('success');
                  } else {
                    setStatus('failed');
                  }
                })
                .catch(() => setStatus('failed'));
            }, 3000);
          } else {
            setStatus('failed');
          }
        })
        .catch(() => setStatus('failed'));
    } else {
      if (txStatus === '200' || txStatus === '0' || txStatus.toLowerCase() === 'success') {
        localStorage.setItem('subscriptionStatus', 'Premium');
        refreshUser();
        setStatus('success');
      } else {
        setStatus('failed');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verifying your payment...</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Please wait while we confirm your transaction.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Welcome to Premium. You now have lifetime access.
            </p>
            {reference && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Ref: {reference}</p>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't confirm your payment. If you were charged, please contact support.
            </p>
            <button
              onClick={() => navigate('/payment')}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors mb-3"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 text-gray-500 dark:text-gray-400 text-sm hover:underline"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
