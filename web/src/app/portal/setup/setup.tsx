'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Kicker } from '@/components/ui/card';
import { CheckIcon } from '@/components/icons';
import { AUTHORITY_LABEL, EQUIPMENT_LABEL, ROLE_LABEL } from '@/lib/perspective';
import type { AuthorityId, EquipmentId, OperatingProfile, RoleId } from '@/lib/domain';
import { cn } from '@/lib/cn';

const ROLES = Object.entries(ROLE_LABEL) as [RoleId, string][];
const EQUIP = Object.entries(EQUIPMENT_LABEL) as [EquipmentId, string][];
const AUTH = Object.entries(AUTHORITY_LABEL) as [AuthorityId, string][];

export function Setup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<OperatingProfile>({
    role: 'independent',
    equipment: 'dry_van',
    authority: 'own',
    set: false,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (res.ok) router.push('/portal');
    } finally {
      setBusy(false);
    }
  }

  const choices: { key: string; label: string }[] =
    step === 0
      ? ROLES.map(([k, l]) => ({ key: k, label: l }))
      : step === 1
        ? EQUIP.map(([k, l]) => ({ key: k, label: l }))
        : AUTH.map(([k, l]) => ({ key: k, label: l }));

  const selected =
    step === 0 ? profile.role : step === 1 ? profile.equipment : profile.authority;
  const pick = (key: string) =>
    step === 0
      ? setProfile({ ...profile, role: key as RoleId })
      : step === 1
        ? setProfile({ ...profile, equipment: key as EquipmentId })
        : setProfile({ ...profile, authority: key as AuthorityId });

  const title =
    step === 0 ? 'How do you work?' : step === 1 ? "What are you running?" : 'Who holds the authority?';
  const body =
    step === 0
      ? "We'll tailor your portal to that."
      : step === 1
        ? 'We show you loads and tools that fit your equipment.'
        : 'This decides what shows up — load board, factoring, dispatch.';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Kicker>Set up your work profile</Kicker>
        <span className="text-xs font-bold text-faint">Step {step + 1} of 3</span>
      </div>
      <div className="mb-6 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-accent' : 'bg-line')} />
        ))}
      </div>

      <h1 className="text-3xl font-black tracking-tight text-ink">{title}</h1>
      <p className="pretty mt-2 text-muted">{body}</p>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {choices.map((c) => (
          <button
            key={c.key}
            onClick={() => pick(c.key)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 text-left transition',
              selected === c.key
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-white hover:border-accent/40',
            )}
          >
            <span className="text-[15px] font-bold text-ink">{c.label}</span>
            {selected === c.key ? <CheckIcon width={18} height={18} className="text-accent" /> : null}
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? router.push('/portal') : setStep(step - 1))}>
          {step === 0 ? 'Skip for now' : 'Back'}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Done — open my portal'}</Button>
        )}
      </div>
    </div>
  );
}
