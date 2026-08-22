import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crown, ArrowRight, CheckCircle2 } from 'lucide-react';

const SubscriptionStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscriptionStatus === 'Premium';

  if (isPremium) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-lg">Premium Active</div>
            <div className="text-indigo-100 text-sm">Lifetime access</div>
          </div>
          <CheckCircle2 className="w-5 h-5 ml-auto text-indigo-200" />
        </div>
        <p className="text-indigo-100 text-sm">
          ESLCE practice, advanced analytics, and all exam features unlocked.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
          <Crown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">Free Plan</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Upgrade to unlock Premium features
          </div>
        </div>
        <button
          onClick={() => navigate('/payment')}
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Upgrade
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
