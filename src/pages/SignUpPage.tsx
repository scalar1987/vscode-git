import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { signUp } from '../lib/auth';
import { supabase } from '../lib/centersData';
import { AuthShell } from '../components/auth/AuthShell';

interface CentreOption {
  id: string;
  name: string;
}

const inputCls =
  'mt-1.5 w-full px-3.5 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-dg-green-500 focus:border-dg-green-500';

export function SignUpPage() {
  const [centres, setCentres] = useState<CentreOption[]>([]);
  const [fullName, setFullName] = useState('');
  // Option values: a centre id, or "org:<name>" for GGGI / partner organisations
  const [choice, setChoice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('centres')
      .select('id, name')
      .order('sort_order')
      .then(({ data }) => setCentres((data ?? []) as CentreOption[]));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      choice: choice.startsWith('org:')
        ? { kind: 'org', org: choice.slice(4) }
        : { kind: 'centre', centreId: choice },
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-700">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to confirm your account.
          </p>
          <p className="text-sm text-gray-700">
            After GGGI approves your account, you will be able to enter data for your centre.
          </p>
          <Link to="/login" className="inline-block text-sm font-medium text-dg-green-700 hover:underline">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
          <p className="mt-1 text-sm text-gray-600">For centre trainers, GGGI and implementing partners</p>
        </div>

        <label className="block text-sm font-medium text-gray-800">
          Full name
          <input required value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Centre or organisation
          <select
            required
            value={choice}
            onChange={e => setChoice(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>Select your centre</option>
            <optgroup label="Centres">
              {centres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="N/A (GGGI / implementing partners)">
              <option value="org:GGGI">N/A GGGI</option>
              <option value="org:SNDI">N/A SNDI</option>
              <option value="org:Dakyung">N/A Dakyung</option>
              <option value="org:Barka Fund">N/A Barka Fund</option>
              <option value="org:Impact Lab">N/A Impact Lab</option>
              <option value="org:DigiFemme">N/A DigiFemme</option>
              <option value="org:Betterworld">N/A Betterworld</option>
            </optgroup>
          </select>
        </label>

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
          Password (min. 8 characters)
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!choice && <p className="text-xs text-gray-500">Choose your centre or organisation to continue.</p>}

        <button
          type="submit"
          disabled={busy || !choice}
          className="w-full px-4 py-2.5 rounded-lg bg-dg-green-600 hover:bg-dg-green-700 disabled:opacity-50 text-white text-base font-medium transition-colors"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-dg-green-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default SignUpPage;
