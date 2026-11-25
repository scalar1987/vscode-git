import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setNewPassword } from '../lib/auth';
import { supabase } from '../lib/centersData';
import { AuthShell } from '../components/auth/AuthShell';

// Opened from the reset link in the email. Supabase signs the user in with a recovery session,
// and this page sets the new password.
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Recovery session is set when the link is opened
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    const err = await setNewPassword(password);
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
    setTimeout(() => navigate('/'), 1500);
  };

  const inputCls =
    'mt-1.5 w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500 focus:border-dg-green-500';

  return (
    <AuthShell>
      {done ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Password updated</h1>
          <p className="text-sm text-gray-600">Taking you to the dashboard…</p>
        </div>
      ) : !ready ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Reset link not valid</h1>
          <p className="text-sm text-gray-600">Open the newest link from the email, or request a new one from the sign-in page.</p>
          <Link to="/login" className="text-sm font-medium text-dg-green-700 hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Set a new password</h1>
            <p className="mt-1 text-sm text-gray-600">At least 8 characters.</p>
          </div>
          <label className="block text-sm font-medium text-gray-800">
            New password
            <input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Confirm new password
            <input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputCls} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-lg bg-dg-green-600 hover:bg-dg-green-700 disabled:opacity-60 text-white text-base font-medium transition-colors"
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ResetPasswordPage;
