import { describe, expect, it } from 'vitest';

import {
  formatWindow,
  rowToDoc,
  rowToLoad,
  rowToMessage,
  type DocRow,
  type LoadRow,
  type MessageRow,
} from '@/lib/live-api';

const loadRow = (over: Partial<LoadRow> = {}): LoadRow => ({
  id: 'load_1',
  ref: 'BOL-882114',
  origin: 'Charlotte, NC',
  destination: 'Raleigh, NC',
  distance_mi: 165,
  weight_lb: 18750,
  equipment: 'Dry Van 53ft',
  equipment_type: 'dry_van',
  payout: '980.00',
  pickup_at: '2026-10-01T11:00:00Z',
  deliver_by: '2026-10-01T18:00:00Z',
  status: 'open',
  shipper: 'Raleigh Freight Co.',
  posted_by: null,
  source: 'Raleigh Freight Board',
  origin_lat: 35.227,
  origin_lng: -80.843,
  dest_lat: 35.78,
  dest_lng: -78.639,
  accepted_by: null,
  accepted_at: null,
  created_at: '2026-09-28T00:00:00Z',
  ...over,
});

describe('live-api row mapping', () => {
  it('maps a load row, coercing numeric payout and coords', () => {
    const l = rowToLoad(loadRow());
    expect(l.payout).toBe(980);
    expect(typeof l.payout).toBe('number');
    expect(l.originCoords).toEqual({ lat: 35.227, lng: -80.843 });
    expect(l.destCoords).toEqual({ lat: 35.78, lng: -78.639 });
    expect(l.equipmentType).toBe('dry_van');
    expect(l.acceptedAt).toBeUndefined();
  });

  it('falls back to the shipper when no poster and omits absent coords', () => {
    const l = rowToLoad(loadRow({ posted_by: null, origin_lat: null, origin_lng: null }));
    expect(l.postedBy).toBe('Raleigh Freight Co.');
    expect(l.originCoords).toBeUndefined();
  });

  it('maps an accepted load with a timestamp', () => {
    const l = rowToLoad(
      loadRow({ status: 'accepted', accepted_by: 'u1', accepted_at: '2026-09-28T12:00:00Z' }),
    );
    expect(l.status).toBe('accepted');
    expect(l.acceptedAt).toBe('2026-09-28T12:00:00Z');
  });

  it('maps a document row and coerces its amount', () => {
    const r: DocRow = {
      id: 'd1',
      kind: 'Invoice',
      load_ref: 'BOL-882114',
      bol_number: 'BOL-882114',
      shipper: 'Raleigh Freight Co.',
      consignee: 'Piedmont Cold',
      weight_lb: 31000,
      amount: '1480.50',
      status: 'verified',
      file_name: 'invoice.pdf',
      created_at: '2026-09-03T14:12:00Z',
    };
    const d = rowToDoc(r);
    expect(d.amount).toBe(1480.5);
    expect(d.status).toBe('verified');
    expect(d.fileName).toBe('invoice.pdf');
  });

  it('maps a dispatch message, defaulting the from label', () => {
    const mine: MessageRow = {
      id: 'm1',
      sender: 'me',
      from_label: '',
      body: 'At the gate',
      unread: false,
      created_at: new Date().toISOString(),
    };
    expect(rowToMessage(mine).from).toBe('You');

    const theirs: MessageRow = { ...mine, sender: 'dispatch', from_label: '', body: 'Dock 4' };
    expect(rowToMessage(theirs).from).toBe('Dispatch');
  });

  it('formats a missing window as an em dash and a real one as a string', () => {
    expect(formatWindow(null)).toBe('—');
    expect(formatWindow('not-a-date')).toBe('—');
    expect(formatWindow('2026-10-01T11:00:00Z')).toMatch(/\d{2}:\d{2}$/);
  });
});
