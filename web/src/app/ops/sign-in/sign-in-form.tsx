'use client';

import { useActionState } from 'react';

import { signInAction } from '../auth-actions';

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent"
          placeholder="you@truckbuddy.online"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent"
          placeholder="••••••••"
        />
      </div>
      {state?.error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent py-3 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
