import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfile, getSession, onAuthChange, signOut, type Profile } from '../../lib/auth';

// Shows "Sign in", or the signed-in user's role and a "Sign out" button
export function AuthButton() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = async () => {
    const session = await getSession();
    setEmail(session?.user.email ?? null);
    setProfile(session ? await getProfile() : null);
  };

  useEffect(() => {
    refresh();
    return onAuthChange(() => refresh());
  }, []);

  if (!email) {
    return (
      <Link
        to="/login"
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
      >
        Sign in
      </Link>
    );
  }

  const roleLabel = profile ? (profile.role === 'ggg' ? 'GGGI' : profile.role === 'partner' ? 'Partner' : 'Coordinator') : 'No role';

  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline text-xs text-gray-500" title={email}>
        {roleLabel}
      </span>
      <button
        onClick={async () => {
          await signOut();
          navigate('/');
        }}
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}
