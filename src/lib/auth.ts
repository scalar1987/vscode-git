import type { Session } from '@supabase/supabase-js';
import { supabase } from './centersData';

export type Role = 'ggg' | 'partner' | 'coordinator';

export interface Profile {
  role: Role;
  centre_id: string | null;
  full_name: string | null;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role, centre_id, full_name')
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}
