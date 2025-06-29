import React from 'react';
import { stripeProducts } from '../stripe-config';
import PricingCard from '../components/PricingCard';
import { useAuth } from '../context/OptimizedAuthContext';
import { Navigate } from 'react-router-dom';

const Pricing: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of riDesk with our premium features and priority support.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
          {stripeProducts.map((product, index) => (
            <PricingCard
              key={product.id}
              product={product}
              isPopular={index === 0} // Make the first product popular
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Can I cancel anytime?</h3>
              <p className="mt-2 text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">What payment methods do you accept?</h3>
              <p className="mt-2 text-gray-600">
                We accept all major credit cards including Visa, Mastercard, American Express, and Discover.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Is there a free trial?</h3>
              <p className="mt-2 text-gray-600">
                We offer a free tier with basic features. You can upgrade to a paid plan at any time to unlock premium features.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900">Do you offer refunds?</h3>
              <p className="mt-2 text-gray-600">
                We offer a 30-day money-back guarantee for all new subscriptions. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;