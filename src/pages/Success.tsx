import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';

const Success: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading period to show the success animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 animate-pulse">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="mt-2 text-lg text-gray-600">
            Thank you for your purchase. Your subscription is now active.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">What's Next?</h2>
          <ul className="space-y-3 text-left">
            <li className="flex items-start">
              <ArrowRight className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Access all premium features in your dashboard</span>
            </li>
            <li className="flex items-start">
              <ArrowRight className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Explore advanced mission management tools</span>
            </li>
            <li className="flex items-start">
              <ArrowRight className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Get priority support when you need help</span>
            </li>
          </ul>
        </div>

        {sessionId && (
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Session ID:</strong> {sessionId}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Keep this for your records
            </p>
          </div>
        )}

        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Link>
          
          <Link
            to="/profile"
            className="w-full flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            View Subscription Details
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? <a href="mailto:support@ridesk.com" className="text-blue-600 hover:text-blue-500">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;