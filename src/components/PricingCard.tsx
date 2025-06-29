import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { StripeProduct } from '../stripe-config';
import { useAuth } from '../context/OptimizedAuthContext';
import toast from 'react-hot-toast';

interface PricingCardProps {
  product: StripeProduct;
  isPopular?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ product, isPopular = false }) => {
  const { user, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user || !accessToken) {
      toast.error('Please log in to subscribe');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = () => {
    const price = product.price.toFixed(2);
    if (product.mode === 'subscription' && product.interval) {
      return `$${price}/${product.interval}`;
    }
    return `$${price}`;
  };

  const features = [
    'Access to all missions',
    'Priority support',
    'Advanced analytics',
    'Custom integrations',
    'Team collaboration tools'
  ];

  return (
    <div className={`relative rounded-2xl border ${isPopular ? 'border-blue-500 shadow-lg' : 'border-gray-200'} bg-white p-8`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
        <p className="mt-2 text-gray-600">{product.description}</p>
        
        <div className="mt-6">
          <span className="text-4xl font-bold text-gray-900">{formatPrice()}</span>
          {product.mode === 'subscription' && (
            <span className="text-gray-500 ml-1">per {product.interval}</span>
          )}
        </div>
      </div>

      <ul className="mt-8 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={isLoading}
        className={`mt-8 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isPopular
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Get ${product.name}`
        )}
      </button>
    </div>
  );
};

export default PricingCard;