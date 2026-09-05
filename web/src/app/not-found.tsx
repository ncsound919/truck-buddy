import Link from 'next/link';

/** 404 — unknown route. */
export default function NotFound() {
  return (
    <main style={{ padding: '64px 24px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>The page you asked for doesn&apos;t exist or moved.</p>
      <div style={{ marginTop: 24 }}>
        <Link href="/">Back home</Link>
      </div>
    </main>
  );
}
