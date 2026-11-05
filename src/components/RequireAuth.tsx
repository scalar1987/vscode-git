import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession, onAuthChange } from '../lib/auth';

// Everything except the sign-in and sign-up pages needs a signed-in session
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'in' | 'out'>('checking');

  useEffect(() => {
    let alive = true;
    const check = () => {
      getSession().then(s => {
        if (alive) setStatus(s ? 'in' : 'out');
      });
    };
    check();
    const off = onAuthChange(check);
    return () => {
      alive = false;
      off();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dg-green-600" />
      </div>
    );
  }
  if (status === 'out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
