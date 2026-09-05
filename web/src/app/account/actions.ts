'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServer } from '@/lib/supabase/server';

/** Update the signed-in user's display name on their own profile row (RLS-scoped). */
export async function updateNameAction(_prev: unknown, formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await sb
    .from('profiles')
    .update({ full_name: name || null })
    .eq('id', user.id);
  if (error) return { error: error.message };
  // Keep auth user_metadata in sync so the header reflects the new name.
  if (name) await sb.auth.updateUser({ data: { full_name: name } });
  revalidatePath('/account');
  return { ok: true, message: 'Name updated.' };
}
