import { parseBolFields, buildOcrDocument, isOnDeviceOcrAvailable, recognizeImageText } from '@/services/ocr';

describe('ocr parsers (pure field extraction)', () => {
  it('parses BOL, shipper, consignee, weight, and date from raw text', () => {
    const fields = parseBolFields(
      'BOL: 882114\nSHIPPER: Raleigh Freight Co.\nCONSIGNEE: ACME Distribution\nWEIGHT: 18,750 LBS\n2026-09-04',
      'Fallback',
    );
    expect(fields.bol_number).toContain('BOL');
    expect(fields.shipper).toContain('Raleigh');
    expect(fields.consignee).toContain('ACME');
    expect(fields.weight).toBe(18750);
    expect(fields.date).toContain('2026-09-04');
  });

  it('falls back to the consignee fallback when absent', () => {
    const fields = parseBolFields('nothing here', 'ACME Distribution Center');
    expect(fields.consignee).toBe('ACME Distribution Center');
    expect(fields.weight).toBe(0);
  });

  it('builds a typed document from OCR lines with an image uri', () => {
    const doc = buildOcrDocument('BOL', 'stop_1', 'ACME', 'file:///img.jpg', ['BOL 7', 'SHIPPER: X']);
    expect(doc.rawImageUrl).toBe('file:///img.jpg');
    expect(doc.type).toBe('BOL');
    expect(doc.extractedText.lines).toHaveLength(2);
  });

  it('recognizeImageText degrades to null without a native module', async () => {
    const lines = await recognizeImageText('file:///any.jpg');
    expect(lines).toBeNull();
  });
});
