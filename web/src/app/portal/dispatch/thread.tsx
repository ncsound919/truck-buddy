'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { DispatchMessage } from '@/lib/domain';
import { cn } from '@/lib/cn';

const QUICK = [
  'ETA at the dock is 30 min',
  'Delivered — sending the POD now',
  'Any return loads from here?',
  'Truck issue — need a mechanic, SPN 110',
];

export function DispatchThread({ initial }: { initial: DispatchMessage[] }) {
  const [messages, setMessages] = useState<DispatchMessage[]>(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(body: string) {
    const t = body.trim();
    if (!t) return;
    setBusy(true);
    setText('');
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error('send_failed');
      const { message } = (await res.json()) as { message: DispatchMessage };
      setMessages((m) => [message, ...m]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="max-h-[52vh] space-y-3 overflow-y-auto p-5">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.sender === 'me' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm',
                m.sender === 'me' ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md bg-bg-alt text-ink',
              )}
            >
              <div className={cn('mb-0.5 text-[11px] font-bold', m.sender === 'me' ? 'text-white/80' : 'text-faint')}>
                {m.from} · {m.at}
                {m.unread && m.sender !== 'me' ? ' · unread' : ''}
              </div>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line bg-bg-alt p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={busy}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(text)}
            placeholder="Message dispatch…"
            className="h-11 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-accent"
          />
          <Button onClick={() => send(text)} disabled={busy || !text.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
