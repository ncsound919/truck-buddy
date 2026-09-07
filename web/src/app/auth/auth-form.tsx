'use client';

import { useActionState, useState, useTransition } from 'react';

import { signInAction, signUpAction, type AuthState } from './actions';
import { signInWithOAuth, resetPassword, resendConfirmation } from '@/lib/supabase-client';
import { ArrowRightIcon, CheckIcon, GoogleIcon } from '@/components/icons';

export type AuthMode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const action = mode === 'sign-in' ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);
  const [oauthPending, startOAuth] = useTransition();
  const [resetPending, startReset] = useTransition();
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resendPending, startResend] = useTransition();
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const submitting = pending || oauthPending;
  const disabled = submitting || resetPending || resendPending;

  async function onGoogle() {
    startOAuth(async () => {
      const { error } = await signInWithOAuth('google');
      if (error) {
        // show inline by re-rendering state; simplest: alert (rare path)
        alert(`Google sign-in failed: ${error.message}`);
      }
    });
  }

  async function onReset() {
    const emailInput = (document.getElementById('email') as HTMLInputElement | null)?.value?.trim();
    if (!emailInput) {
      setResetError('Enter your email above first.');
      setResetNotice(null);
      return;
    }
    setResetError(null);
    setResetNotice(null);
    startReset(async () => {
      const { error } = await resetPassword(emailInput);
      if (error) {
        setResetError(error.message);
      } else {
        setResetNotice('Password reset email sent. Check your inbox.');
      }
    });
  }

  async function onResend() {
    const emailInput = (document.getElementById('email') as HTMLInputElement | null)?.value?.trim();
    if (!emailInput) {
      setResendNotice('Enter your email above first.');
      return;
    }
    setResendNotice(null);
    startResend(async () => {
      const { error } = await resendConfirmation(emailInput);
      if (error) {
        setResendNotice(`Couldn't resend: ${error.message}`);
      } else {
        setResendNotice('Confirmation email re-sent. Check your inbox (and spam).');
      }
    });
  }

  const input =
    'h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] font-medium text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 transition';
  const label = 'mb-1.5 block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2';

  return (
    <div className="mt-7 space-y-4">
      {/* Google OAuth button */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={disabled}
        className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 text-[15px] font-bold text-ink shadow-[0_1px_2px_rgba(11,22,38,0.06)] transition hover:bg-[#f8fafb] hover:shadow-[0_4px_12px_-2px_rgba(11,22,38,0.08)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon width={20} height={20} />
        <span>
          {oauthPending
            ? 'Opening Google…'
            : mode === 'sign-in'
              ? 'Continue with Google'
              : 'Sign up with Google'}
        </span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center py-1" role="separator" aria-orientation="horizontal">
        <div className="flex-1 border-t border-line" />
        <span className="px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">or with email</span>
        <div className="flex-1 border-t border-line" />
      </div>

      <form action={formAction} className="space-y-4">
        {mode === 'sign-up' ? (
          <div>
            <label className={label} htmlFor="name">Full name</label>
            <input id="name" name="name" className={input} placeholder="Terrence Brooks" autoComplete="name" />
          </div>
        ) : null}

        <div>
          <label className={label} htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={input}
            placeholder="you@truckbuddy.online"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className={label} htmlFor="password">Password</label>
            {mode === 'sign-in' ? (
              <button
                type="button"
                onClick={onReset}
                disabled={disabled}
                className="text-[12px] font-bold text-accent hover:underline disabled:opacity-50"
              >
                {resetPending ? 'Sending…' : 'Forgot?'}
              </button>
            ) : null}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className={input}
            placeholder="••••••••"
          />
          {mode === 'sign-up' ? (
            <p className="mt-1.5 text-[12px] text-muted">At least 8 characters.</p>
          ) : null}
        </div>

        {state?.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
            {state.error}
          </div>
        ) : null}

        {state?.notice ? (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800">
              <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>{state.notice}</span>
            </div>
            {mode === 'sign-up' ? (
              <button
                type="button"
                onClick={onResend}
                disabled={disabled}
                className="text-[12px] font-bold text-accent hover:underline disabled:opacity-50"
              >
                {resendPending ? 'Resending…' : 'Didn’t get it? Resend confirmation email'}
              </button>
            ) : null}
          </div>
        ) : null}

        {resetError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-700">
            {resetError}
          </div>
        ) : null}

        {resetNotice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12px] font-semibold text-emerald-800">
            {resetNotice}
          </div>
        ) : null}

        {resendNotice && mode !== 'sign-up' ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[12px] font-semibold text-sky-800">
            {resendNotice}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3B8AE8] to-[#0F6BFF] px-5 text-[15px] font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(15,107,255,0.6)] transition hover:shadow-[0_12px_28px_-8px_rgba(15,107,255,0.7)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_4px_12px_-4px_rgba(15,107,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {pending ? (
            'Working…'
          ) : (
            <>
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              <ArrowRightIcon width={18} height={18} className="transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
