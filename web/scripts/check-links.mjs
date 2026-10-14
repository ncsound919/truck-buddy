#!/usr/bin/env node
// Link sweeper for the Truck Buddy marketing site.
//
// The site once advertised a /download page and an APK that shipped without a
// target (see Coding lessons 2026-10-11-truckbuddy-site-download-link-has-no-target).
// This checks the critical public URLs actually resolve, including the APK the
// /download page points at.
//
// Usage:
//   node scripts/check-links.mjs                 # checks https://truckbuddy.online
//   node scripts/check-links.mjs https://preview.example.app
//   BASE_URL=http://localhost:3000 node scripts/check-links.mjs
//
// Exit code 0 = every link resolved 2xx; 1 = at least one failed.

const BASE = (process.argv[2] || process.env.BASE_URL || 'https://truckbuddy.online').replace(/\/+$/, '');

const PATHS = ['/', '/download', '/portal/pricing', '/privacy', '/terms'];

async function status(url, { method = 'GET' } = {}) {
  try {
    const res = await fetch(url, { method, redirect: 'follow' });
    return { url, status: res.status, ok: res.ok, location: res.redirected ? res.url : null };
  } catch (err) {
    return { url, status: 0, ok: false, error: err?.message || String(err) };
  }
}

/** Pull the first https://… .apk link out of the /download page. */
async function findApk(downloadUrl) {
  try {
    const html = await (await fetch(downloadUrl)).text();
    const m = html.match(/https:\/\/[^"' <]+\.apk/);
    return m?.[0] ?? null;
  } catch {
    return null;
  }
}

const results = [];
for (const p of PATHS) {
  results.push({ label: p, ...(await status(BASE + p)) });
}

const apk = await findApk(BASE + '/download');
if (apk) {
  results.push({ label: 'APK', ...(await status(apk, { method: 'HEAD' })) });
} else {
  results.push({ label: 'APK', url: `${BASE}/download`, status: 0, ok: false, error: 'no .apk link found on /download' });
}

let failed = 0;
for (const r of results) {
  const mark = r.ok ? 'OK ' : 'FAIL';
  if (!r.ok) failed += 1;
  const note = r.error ? ` (${r.error})` : r.location ? ` -> ${r.location}` : '';
  console.log(`${mark} ${String(r.status).padStart(3)}  ${r.label}${note}`);
}

console.log(`\n${results.length - failed}/${results.length} links OK (base: ${BASE})`);
process.exit(failed === 0 ? 0 : 1);
