'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { getSupabaseServer } from '@/lib/supabase/server';

export type AuthState = { error?: string; notice?: string } | null;

/** Create a new account. Profile row is backfilled by the DB trigger (schema.sql). */
export async function signUpAction(_prev: AuthState, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('name') || '').trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const sb = await getSupabaseServer();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || null }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'}/account` },
  });
  if (error) return { error: error.message };

  // If email confirmation is required, tell the user; otherwise proceed to /account.
  if (data.session) {
    revalidatePath('/');
    redirect('/account');
  }
  return { notice: 'Check your email to confirm your account before signing in.' };
}

export async function signInAction(_prev: AuthState, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const sb = await getSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message };
  }
  revalidatePath('/');
  redirect('/portal');
}

export async function signOutAction() {
  const sb = await getSupabaseServer();
  await sb.auth.signOut();
  revalidatePath('/');
  redirect('/');
}
