import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crown, ArrowRight, CheckCircle2 } from 'lucide-react';

const SubscriptionStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscriptionStatus === 'Premium';

  if (isPremium) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">Premium Active</span>
          <span className="text-indigo-200 text-xs ml-2">Lifetime access</span>
        </div>
        <CheckCircle2 className="w-4 h-4 text-indigo-200 flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Free Plan</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">Upgrade to unlock all features</span>
      </div>
      <button
        onClick={() => navigate('/payment')}
        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
      >
        Upgrade
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default SubscriptionStatus;
