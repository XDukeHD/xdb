'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Database, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { setToken: setAuthToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      // Test the token by attempting to list databases
      const response = await fetch('/api/xdb/databases', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If response is 200 (OK), the token is valid
      if (response.ok) {
        setSuccess(true);
        setAuthToken(token);
        // Small delay to show success state before redirect
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        // If response is 401 or any other error, the token is invalid
        const data = await response.json();
        setError(data.error || 'Invalid authentication token');
      }
    } catch {
      setError('Failed to authenticate. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-full shadow-lg">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">xDB Manager</h1>
            <p className="text-blue-100">Database Management Suite</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="token" className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Authentication Token</span>
                  </div>
                </label>
                <input
                  type="password"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-400"
                  placeholder="Enter your token"
                  required
                  disabled={loading || success}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Authentication Failed</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Token Valid</p>
                    <p className="text-sm text-green-700 mt-1">Redirecting to dashboard...</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token || success}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 flex items-center justify-center space-x-2 ${
                  success
                    ? 'bg-green-600 text-white'
                    : loading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Authenticating...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Authenticated</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span>Token stored in memory only</span>
                </div>
                <div className="text-gray-400">No persistent storage</div>
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <p className="text-white text-sm text-center">
            Session persists during your browser tab • Logs out when you close the tab
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
