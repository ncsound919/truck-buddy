import Link from 'next/link';

export const dynamic = 'force-static';

const RELEASE = {
  version: '1.0.1-beta.2',
  url: 'https://github.com/ncsound919/truck-buddy/releases/download/v1.0.1-beta.2/app-release.apk',
  sizeMb: '50.6',
  sha256: '34C7EC7F68AA362907F9130691388E657B8BC4509E07D4F39F3F2CAB6017CB78',
  certSha256: '755dec38fa0e9c4d80640302840344454113181f5921ab8107b319758a5bf14a',
  requires: 'Android 9 or newer, arm64 phone or tablet',
};

/** Public APK download for the Truck Buddy cab app beta. */
export default function DownloadPage() {
  return (
    <main style={{ padding: '64px 24px', maxWidth: 680, margin: '0 auto' }}>
      <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2, color: '#0f6bff' }}>GET THE APP</p>
      <h1>Truck Buddy for Android</h1>
      <p>
        Beta {RELEASE.version} · {RELEASE.sizeMb} MB · {RELEASE.requires}. iOS TestFlight
        invites go out from the portal — <Link href="/portal/pricing">pick a plan</Link> to
        request one.
      </p>
      <div style={{ margin: '28px 0' }}>
        <a
          href={RELEASE.url}
          style={{
            display: 'inline-block', background: '#0f6bff', color: '#fff',
            fontWeight: 800, padding: '15px 28px', borderRadius: 14, textDecoration: 'none',
          }}
        >
          Download the APK
        </a>
      </div>
      <h2>Install in 3 steps</h2>
      <ol>
        <li>Tap Download above on your phone.</li>
        <li>Open the file — Android will ask permission to install unknown apps. Allow it for your browser.</li>
        <li>Open Truck Buddy and start your shift. Email and text sending switch on from My Tools.</li>
      </ol>
      <h2>Verify the download (optional)</h2>
      <p>
        SHA-256: <code style={{ wordBreak: 'break-all' }}>{RELEASE.sha256}</code>
        <br />
        Signer certificate SHA-256: <code style={{ wordBreak: 'break-all' }}>{RELEASE.certSha256}</code>
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </main>
  );
}
