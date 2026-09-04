'use client';

import { useRef, useState } from 'react';

import { DocKindLabel } from '@/components/portal/primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanIcon } from '@/components/icons';
import type { DocKind } from '@/lib/domain';

/** In-browser OCR via Tesseract.js (Wasm). Loads worker/core/language from CDN
 *  at runtime so nothing heavy is bundled into the Next build. */
const WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js';
const CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core-simd.wasm.js';
const LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

interface Parsed {
  text: string;
  bol?: string;
  weightLb?: number;
  shipper?: string;
}

export function RealOcrScan({ loadRefs }: { loadRefs: string[] }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [kind, setKind] = useState<DocKind>('BOL');
  const [loadRef, setLoadRef] = useState(loadRefs[0] ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setParsed(null);
    setSaved(false);
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        workerPath: WORKER_PATH,
        corePath: CORE_PATH,
        langPath: LANG_PATH,
      });
      const { data } = await worker.recognize(url);
      await worker.terminate();
      setParsed({ text: data.text, ...extract(data.text) });
    } catch (e) {
      console.error(e);
      setError('OCR could not run (needs network to load the Tesseract worker). Try again or use the mock capture below.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch('/api/portal/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, loadRef }),
      });
      if (!res.ok) throw new Error('save_failed');
      await res.json();
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ScanIcon width={18} height={18} />
        </span>
        Scan a real bill of lading (in-browser OCR)
        <Badge tone="neutral">Tesseract.js</Badge>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? 'Reading image…' : 'Choose / photograph a BOL'}
      </Button>

      {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}

      {preview ? (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <img src={preview} alt="Uploaded document" className="h-44 w-32 shrink-0 rounded-xl border border-line object-cover" />
          <div className="min-w-0 flex-1">
            {parsed ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {parsed.bol ? <Chip k="BOL" v={parsed.bol} /> : null}
                  {parsed.shipper ? <Chip k="Shipper" v={parsed.shipper} /> : null}
                  {parsed.weightLb ? <Chip k="Weight" v={`${parsed.weightLb.toLocaleString()} lb`} /> : null}
                </div>
                <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-bg-alt p-3 text-xs text-ink-2">
                  {parsed.text}
                </pre>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-faint">Kind</span>
                    <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none">
                      {(['BOL', 'DeliveryReceipt', 'Invoice'] as DocKind[]).map((k) => (
                        <option key={k} value={k}>{DocKindLabel({ kind: k })}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase text-faint">Load</span>
                    <select value={loadRef} onChange={(e) => setLoadRef(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none">
                      {loadRefs.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <Button onClick={save} disabled={busy}>File against load</Button>
                </div>
                {saved ? (
                  <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                    OCR text filed against {loadRef} · timestamped.
                  </p>
                ) : null}
              </>
            ) : busy ? (
              <p className="text-sm text-muted">Running OCR — this can take a few seconds…</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-faint">
        Runs entirely in your browser via Tesseract.js (Apache-2.0). Raw OCR text is shown so you can
        verify before it&rsquo;s filed — no images leave your device.
      </p>
    </div>
  );
}

function Chip({ k, v }: { k: string; v: string }) {
  return (
    <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-600">
      {k}: <b>{v}</b>
    </span>
  );
}

function extract(text: string): { bol?: string; weightLb?: number; shipper?: string } {
  const bol = text.match(/BOL[- ]?[0-9A-Z]+/i)?.[0];
  const shipperMatch = text.match(/SHIPPER[:\s]*([^\n]+)/i) ?? text.match(/(?:Shipper|Sold to)[:\s]*([^\n]+)/i);
  const weight = text.match(/([\d,]{3,})\s*(?:lbs|lb|pounds)/i);
  return {
    bol,
    shipper: shipperMatch?.[1]?.trim(),
    weightLb: weight ? parseInt(weight[1].replace(/,/g, ''), 10) : undefined,
  };
}
