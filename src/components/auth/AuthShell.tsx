import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Shared frame for the sign-in and sign-up pages: same background and brand header as the dashboard
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#FAFAF7' }}
    >
      <Link to="/login" className="flex flex-col items-center gap-3 mb-8">
        <img src="/gggi logo cote divoire.png" alt="GGGI" className="h-14 w-auto" />
        <span className="text-xl md:text-2xl font-bold text-gray-900">GENIE Centres Dashboard</span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">{children}</div>
    </div>
  );
}

export default AuthShell;
