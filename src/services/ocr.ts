import { Platform } from 'react-native';
import MLKit from 'react-native-mlkit-ocr';

import { DEMO_DRIVER_ID, uid } from '@/domain/data';
import type {
  DocumentType,
  ParsedFields,
  TruckDocument,
} from '@/domain/types';

/**
 * Real on-device OCR (open-source: Google ML Kit via react-native-mlkit-ocr).
 *
 * Only runs on a native development build where the module is autolinked. On
 * Expo Go / web the native module is absent, so every call is guarded and the
 * caller falls back to the mock pipeline. Everything here degrades to `null`
 * rather than throwing — OCR must never crash the driver flow.
 */

function loadModule(): (typeof MLKit) | null {
  if (Platform.OS === 'web') return null;
  try {
    return MLKit;
  } catch {
    return null;
  }
}

export interface OcrLine {
  text: string;
}

/** Runs ML Kit on an image URI and returns recognized line text, or null. */
export async function recognizeImageText(uri: string): Promise<string[] | null> {
  const mod = loadModule();
  if (!mod) return null;
  try {
    const blocks = await mod.detectFromUri(uri);
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const lines: string[] = [];
    for (const block of blocks) {
      if (block.lines?.length) {
        for (const line of block.lines) lines.push(line.text);
      } else if (block.text) {
        lines.push(block.text);
      }
    }
    return lines.filter(Boolean);
  } catch {
    return null;
  }
}

export function isOnDeviceOcrAvailable(): boolean {
  return Platform.OS !== 'web' && loadModule() != null;
}

/** Best-effort extraction of the fields Truck Buddy shows. Falls back gracefully. */
export function parseBolFields(raw: string, consigneeFallback: string): ParsedFields {
  const bol =
    raw.match(/(?:BOL|BL)[-:\s]*([A-Z0-9-]{4,})/i)?.[0]?.trim() ?? '';
  const weightMatch = raw.match(/([\d,]+)\s*(?:lbs|lb|pounds)/i);
  // Prefer ISO (YYYY-MM-DD) — the order Truck Buddy itself stamps. Falls back
  // to a M/D/YYYY (or D/M/YYYY) guess, then today only when no date is present.
  const isoDate = raw.match(/\b(20\d{2}|19\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  const mdyDate = !isoDate && raw.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  const parsedDate = isoDate
    ? `${isoDate[1]}-${String(Number(isoDate[2])).padStart(2, '0')}-${String(Number(isoDate[3])).padStart(2, '0')}`
    : mdyDate
      ? `${mdyDate[3].length === 2 ? `20${mdyDate[3]}` : mdyDate[3]}-${String(Number(mdyDate[1])).padStart(2, '0')}-${String(Number(mdyDate[2])).padStart(2, '0')}`
      : null;
  const shipperMatch = raw.match(/SHIPPER:?\s*([^\n\r]+)/i);
  const consigneeMatch = raw.match(/CONSIGNEE:?\s*([^\n\r]+)/i);

  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  return {
    bol_number: bol || 'BOL-unknown',
    shipper: (shipperMatch?.[1] ?? '').trim() || '—',
    consignee: (consigneeMatch?.[1] ?? consigneeFallback).trim() || consigneeFallback,
    weight: weightMatch ? Number(weightMatch[1].replace(/,/g, '')) : 0,
    date: parsedDate ?? isoToday,
  };
}

/** Builds a fully-typed document record from a real camera capture + OCR text. */
export function buildOcrDocument(
  type: DocumentType,
  stopId: string | undefined,
  consigneeFallback: string,
  uri: string,
  lines: string[],
): TruckDocument {
  const raw = lines.join('\n');
  return {
    id: `doc_${uid()}`,
    driverId: DEMO_DRIVER_ID,
    stopId,
    type,
    rawImageUrl: uri, // real photo captured on the device
    extractedText: { raw, lines },
    parsedFields: parseBolFields(raw, consigneeFallback),
    status: 'verified',
    createdAt: new Date().toISOString(),
  };
}
