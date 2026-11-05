import type { Session } from '@supabase/supabase-js';
import { supabase } from './centersData';

export type Role = 'pending' | 'ggg' | 'partner' | 'coordinator';

export type Section = 'tot' | 'infra' | 'greenpreneur' | 'training' | 'advanced' | 'advanced_tot' | 'advanced_ict' | 'advanced_green';

export interface Profile {
  role: Role;
  centre_id: string | null;
  full_name: string | null;
  section_access: Section[];
}

/** Mirrors public.can_edit() in the database. The database is the real check. */
export function canEditSection(profile: Profile | null, centreId: string, section: Section): boolean {
  if (!profile) return false;
  if (profile.role === 'ggg') return true;
  if (profile.role === 'partner') return profile.section_access.includes(section);
  if (profile.role === 'coordinator') return profile.centre_id === centreId && (section === 'infra' || section === 'tot' || section === 'training' || section === 'advanced' || section === 'advanced_tot' || section === 'advanced_ict' || section === 'advanced_green');
  return false;
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
    .select('role, centre_id, full_name, section_access')
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

/** Sign-up: the account starts as 'pending' until an admin approves it. */
export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  /** A real centre id (coordinator) or an organisation name (GGGI / partner) */
  choice: { kind: 'centre'; centreId: string } | { kind: 'org'; org: string };
}): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured';
  const meta =
    input.choice.kind === 'centre'
      ? { full_name: input.fullName, centre_id: input.choice.centreId }
      : { full_name: input.fullName, org: input.choice.org };
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: meta,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  return error ? error.message : null;
}

/** Approved = may see Data Inputs (write rights are enforced in the database). */
export function isApproved(profile: Profile | null): boolean {
  return !!profile && profile.role !== 'pending';
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
