import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DebugLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkAccount = async () => {
    if (!email) {
      alert('Please enter an email to check');
      return;
    }

    setIsChecking(true);
    setDebugInfo(null);

    try {
      console.log('🔍 Starting account debug check...');
      
      // Step 1: Try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'dummy-password'
      });

      const info: any = {
        timestamp: new Date().toISOString(),
        email,
        steps: []
      };

      // Step 2: Check if user exists in auth.users
      info.steps.push({
        step: 'Sign In Attempt',
        success: !signInError,
        data: signInError ? signInError.message : 'Sign in successful',
        details: signInData
      });

      if (signInError) {
        // Try to get more info about why sign in failed
        if (signInError.message.includes('Invalid login credentials')) {
          info.steps.push({
            step: 'Account Status',
            success: false,
            data: 'Account may not exist or password is incorrect',
            suggestion: 'Try creating a new account with this email'
          });
        } else if (signInError.message.includes('Email not confirmed')) {
          info.steps.push({
            step: 'Account Status',
            success: false,
            data: 'Account exists but email not confirmed',
            suggestion: 'Check your email for confirmation link'
          });
        } else {
          info.steps.push({
            step: 'Account Status',
            success: false,
            data: signInError.message,
            suggestion: 'Unknown error - check console for details'
          });
        }
      } else {
        // Sign in successful, check user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', signInData.user.id)
          .single();

        info.steps.push({
          step: 'User Profile Check',
          success: !userError,
          data: userError ? userError.message : 'Profile found',
          details: userData
        });

        // Check user permissions
        if (userData) {
          const { data: permissions } = await supabase
            .from('role_permissions')
            .select('permission_name')
            .eq('role', userData.role);

          info.steps.push({
            step: 'Permissions Check',
            success: true,
            data: `Found ${permissions?.length || 0} permissions`,
            details: permissions
          });
        }

        // Sign out after check
        await supabase.auth.signOut();
      }

      setDebugInfo(info);
    } catch (error: any) {
      console.error('Debug check error:', error);
      setDebugInfo({
        timestamp: new Date().toISOString(),
        email,
        error: error.message,
        steps: [{
          step: 'Debug Check',
          success: false,
          data: error.message
        }]
      });
    } finally {
      setIsChecking(false);
    }
  };

  const createTestAccount = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setIsChecking(true);
    try {
      console.log('🆕 Creating test account...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        alert(`Failed to create account: ${error.message}`);
      } else {
        alert('Test account created successfully! You can now try logging in.');
        // Auto-check the new account
        setTimeout(() => checkAccount(), 1000);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">🔧 Login Debug Tool</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter email to debug"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password (optional for check)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Enter password"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={checkAccount}
            disabled={isChecking}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isChecking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            Check Account
          </button>
          
          <button
            onClick={createTestAccount}
            disabled={isChecking}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isChecking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Create Test Account
          </button>
        </div>
      </div>

      {debugInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Debug Results</h3>
          <div className="text-xs text-gray-500 mb-3">
            Checked at: {new Date(debugInfo.timestamp).toLocaleString()}
          </div>
          
          {debugInfo.error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <div className="flex items-center text-red-800">
                <XCircle className="h-4 w-4 mr-2" />
                Error: {debugInfo.error}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {debugInfo.steps?.map((step: any, index: number) => (
              <div key={index} className={`border rounded p-3 ${step.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center mb-2">
                  {step.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  <span className="font-medium">{step.step}</span>
                </div>
                <div className="text-sm text-gray-700 mb-2">{step.data}</div>
                {step.suggestion && (
                  <div className="text-sm text-blue-700 bg-blue-100 rounded p-2">
                    💡 {step.suggestion}
                  </div>
                )}
                {step.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Show details</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugLogin;