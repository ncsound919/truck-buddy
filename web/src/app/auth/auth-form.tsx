'use client';

import { useActionState } from 'react';

import { signInAction, signUpAction, type AuthState } from './actions';

export type AuthMode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const action = mode === 'sign-in' ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  const input =
    'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent';
  const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted';

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {mode === 'sign-up' ? (
        <div>
          <label className={label} htmlFor="name">Full name</label>
          <input id="name" name="name" className={input} placeholder="Terrence Brooks" autoComplete="name" />
        </div>
      ) : null}
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} placeholder="you@example.com" />
      </div>
      <div>
        <label className={label} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} className={input} placeholder="••••••••" />
        {mode === 'sign-up' ? <p className="mt-1 text-xs text-faint">At least 8 characters.</p> : null}
      </div>
      {state?.error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p> : null}
      {state?.notice ? <p className="rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success">{state.notice}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent py-3 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-50"
      >
        {pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
    </form>
  );
}
