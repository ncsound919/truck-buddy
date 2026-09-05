'use client';

import Link from 'next/link';

/** Root error boundary — something went wrong rendering this route. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: '64px 24px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <p>
        {error?.message || 'The page hit an unexpected error.'} Try again — if it
        keeps happening, contact support.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/">Back home</Link>
      </div>
    </main>
  );
}
