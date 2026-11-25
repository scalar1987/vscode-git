import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset, signIn } from '../lib/auth';
import { AuthShell } from '../components/auth/AuthShell';

// "Forgot password?" sends a reset link to the email typed above (or asks for it)
function ForgotPassword({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = email.trim();

  const send = async () => {
    setError(null);
    if (!target) return setError('Type your email above first.');
    setBusy(true);
    const err = await requestPasswordReset(target);
    setBusy(false);
    if (err) return setError(err);
    setSentTo(target);
  };

  if (sentTo) {
    return <p className="text-sm text-gray-600 text-center">If an account exists for {sentTo}, a reset link is on its way.</p>;
  }
  if (!open) {
    return (
      <p className="text-sm text-center">
        <button type="button" onClick={() => setOpen(true)} className="font-medium text-dg-green-700 hover:underline">
          Forgot password?
        </button>
      </p>
    );
  }
  return (
    <div className="space-y-2 text-center">
      <p className="text-sm text-gray-600">We will email a reset link to the address typed above.</p>
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 text-sm font-medium text-gray-800"
      >
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    navigate('/');
  };

  const inputCls =
    'mt-1.5 w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500 focus:border-dg-green-500';

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-600">For GENIE M&amp;E staff and centre trainers</p>
        </div>

        <label className="block text-sm font-medium text-gray-800">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2.5 rounded-lg bg-dg-green-600 hover:bg-dg-green-700 disabled:opacity-60 text-white text-base font-medium transition-colors"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <ForgotPassword email={email} />

        <p className="text-sm text-gray-600 text-center">
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-dg-green-700 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default LoginPage;
