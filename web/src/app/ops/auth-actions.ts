'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { getSupabaseServer, isAdminEmail } from '@/lib/ops/ops-auth';

export async function signInAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const sb = await getSupabaseServer();

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message };
  }

  // Gate: only allowlisted admins may proceed past sign-in.
  if (!isAdminEmail(email)) {
    await sb.auth.signOut();
    return { error: 'This account is not authorized for the Ops console.' };
  }

  revalidatePath('/ops');
  redirect('/ops');
}

export async function signOutAction() {
  const sb = await getSupabaseServer();
  await sb.auth.signOut();
  redirect('/ops/sign-in');
}
