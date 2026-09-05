'use client';

import Link from 'next/link';

/** Portal section error boundary — keeps a portal failure inside the portal. */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: '48px 24px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1>The portal hit a snag</h1>
      <p>{error?.message || 'This section failed to load.'} Your session is safe — try again.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/portal">Portal home</Link>
      </div>
    </main>
  );
}
