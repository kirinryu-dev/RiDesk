import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import { Crown, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { getProductByPriceId } from '../stripe-config';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

const SubscriptionStatus: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          setError('Failed to load subscription data');
          return;
        }

        setSubscription(data);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user, accessToken]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <Crown className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Free Plan</h3>
            <p className="text-sm text-gray-500">No active subscription</p>
          </div>
        </div>
      </div>
    );
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;
  const isActive = subscription.subscription_status === 'active';
  const isPastDue = subscription.subscription_status === 'past_due';
  const isCanceled = subscription.subscription_status === 'canceled';

  const getStatusColor = () => {
    if (isActive) return 'text-green-800 bg-green-100';
    if (isPastDue) return 'text-yellow-800 bg-yellow-100';
    if (isCanceled) return 'text-red-800 bg-red-100';
    return 'text-gray-800 bg-gray-100';
  };

  const getStatusIcon = () => {
    if (isActive) return <Crown className="h-5 w-5 text-green-600" />;
    if (isPastDue) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <Crown className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {product?.name || 'Pro Plan'}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {subscription.subscription_status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {subscription.current_period_end && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
              {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
            </span>
          </div>
          
          {subscription.payment_method_brand && subscription.payment_method_last4 && (
            <div className="flex items-center text-sm text-gray-600">
              <CreditCard className="h-4 w-4 mr-2" />
              <span>
                {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
              </span>
            </div>
          )}
        </div>
      )}

      {subscription.cancel_at_period_end && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Your subscription will not renew and will end on{' '}
            {subscription.current_period_end && 
              new Date(subscription.current_period_end * 1000).toLocaleDateString()
            }.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;