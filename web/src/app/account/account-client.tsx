'use client';

import { useActionState } from 'react';

import { signOutAction } from '@/app/auth/actions';
import { updateNameAction } from './actions';

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-ink-2 hover:bg-line/50">
        Sign out
      </button>
    </form>
  );
}

export function NameForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateNameAction, null);
  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="name">Display name</label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="email">Email</label>
        <input id="email" value={email} readOnly className="h-11 w-full rounded-lg border border-line bg-line/40 px-3 text-sm text-faint outline-none" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state?.ok ? <span className="text-sm font-semibold text-success">{state.message}</span> : null}
        {state?.error ? <span className="text-sm font-semibold text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
