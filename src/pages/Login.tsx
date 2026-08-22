import { useState } from 'react';
import { authApi,type  LoginRequest } from '../api/auth';

interface LoginProps {
  setToken: (token: string) => void;
}

export default function Login({ setToken }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: LoginRequest = { Email: email, Password: password };
      const response = await authApi.login(data);
      setToken(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-[400px]">
        <h2 className="mb-6 text-center text-gray-800 dark:text-gray-100">MERP Student Assistant Login</h2>
        {error && <div className="text-red-600 dark:text-red-400 mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-base"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-gray-600 dark:text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded text-base disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-500 dark:text-gray-400">
          Don't have an account? <a href="/register" className="text-green-600 dark:text-green-400">Register</a>
        </p>
      </div>
    </div>
  );
}