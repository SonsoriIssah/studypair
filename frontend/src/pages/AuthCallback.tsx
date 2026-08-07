import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setToken } from '../lib/api';

/**
 * Lands here after the backend redirects from /auth/google/callback with
 * `#token=...` (success) or `#error=...` (failure) in the URL fragment.
 * The fragment never touches a server, so this is the only place the raw
 * token exists outside of storage — we pull it out and strip the URL
 * immediately so it doesn't linger in browser history.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('token');
    const err = hash.get('error');

    // Strip the fragment so the token doesn't sit in the address bar or
    // browser history after this point.
    window.history.replaceState(null, '', window.location.pathname);

    if (err || !token) {
      setError('Sign-in with Google did not complete. Please try again.');
      return;
    }

    setToken(token);
    refreshUser().then(() => navigate('/', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-slate-700">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Signing you in…</p>
    </div>
  );
}
