/**
 * Generic, privacy-safe field logistics rules.
 * Pure functions: usable by OCR, barcode capture, and manual entry.
 */

export type Accessorial =
  | 'inside_delivery'
  | 'mattress_removal'
  | 'liftgate'
  | 'two_person_crew'
  | 'assembly';

export interface FieldLogisticsRecord {
  rawText: string;
  loadId?: string;
  bolNumber?: string;
  orderNumbers: string[];
  stagingLocations: string[];
  palletCount?: number;
  cabCount?: number;
  hasDamageOrShortage: boolean;
  accessorials: Accessorial[];
}

export interface PodEvidence {
  locationVerified: boolean;
  photoUri?: string | null;
  signatureName?: string | null;
  exceptionReason?: string | null;
}

export interface PodValidation {
  complete: boolean;
  missing: Array<'location_verification' | 'photo_or_signature' | 'exception_reason'>;
}

const unique = <T,>(values: T[]) => [...new Set(values)];

function captures(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function firstCapture(text: string, pattern: RegExp): string | undefined {
  return captures(text, pattern)[0];
}

function countAfterLabel(text: string, labels: string[]): number | undefined {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\$&')).join('|');
  const match = text.match(new RegExp(`\b(?:${labelPattern})\s*[:#-]?\s*(\d+)`, 'i'));
  return match ? Number(match[1]) : undefined;
}

/** Parses common BOL, manifest, staging-sheet, and handwritten dispatch fields. */
export function parseFieldLogisticsDocument(rawText: string): FieldLogisticsRecord {
  const text = rawText.replace(/\r/g, '\n').replace(/[\t ]+/g, ' ').trim();
  const orderNumbers = captures(
    text,
    /\b(?:order(?:\s*(?:number|no\.?))?|customer\s*order)\s*[:#-]?\s*([A-Z0-9-]{4,})/gi,
  );
  const stagingLocations = captures(text, /\b(?:location|bay|slot|staging)\s*[:#-]?\s*([A-Z]{1,3}\d{1,3})\b/gi);
  const inferredLocations = [...text.matchAll(/\b([A-Z]{1,3}\d{1,3})\b/g)].map((match) => match[1]);
  const accessorials: Accessorial[] = [];

  if (/\b(?:inside|in-home|room[- ]of[- ]choice)\s*(?:delivery|setup)\b/i.test(text)) accessorials.push('inside_delivery');
  if (/\b(?:mattress|old\s+item)\s*(?:removal|haul[- ]away)\b/i.test(text)) accessorials.push('mattress_removal');
  if (/\bliftgate\b/i.test(text)) accessorials.push('liftgate');
  if (/\b(?:two[- ]?(?:person|man)|2[- ]?(?:person|man))\b/i.test(text)) accessorials.push('two_person_crew');
  if (/\b(?:assembly|installation|install)\b/i.test(text)) accessorials.push('assembly');

  return {
    rawText,
    loadId: firstCapture(text, /\bload\s*(?:id|number|no\.?)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i),
    bolNumber: firstCapture(text, /\b(?:bol|b\/?l|bill\s+of\s+lading)\s*(?:id|number|no\.?)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i),
    orderNumbers: unique(orderNumbers),
    stagingLocations: unique([...stagingLocations, ...inferredLocations]),
    palletCount: countAfterLabel(text, ['pallet count', 'pallets']),
    cabCount: countAfterLabel(text, ['cab count', 'cabs', 'cabinets']),
    hasDamageOrShortage: /\b(?:damage(?:d|s)?|short(?:age|s)?|exception)\b/i.test(text),
    accessorials: unique(accessorials),
  };
}

/** A completed delivery needs location proof plus delivery evidence or a documented exception. */
export function validatePodCompletion(evidence: PodEvidence): PodValidation {
  const missing: PodValidation['missing'] = [];
  const hasDeliveryEvidence = Boolean(evidence.photoUri?.trim() || evidence.signatureName?.trim());

  if (!evidence.locationVerified) missing.push('location_verification');
  if (!hasDeliveryEvidence && !evidence.exceptionReason?.trim()) missing.push('photo_or_signature');
  if (!hasDeliveryEvidence && !evidence.exceptionReason?.trim()) missing.push('exception_reason');

  return { complete: missing.length === 0, missing };
}
