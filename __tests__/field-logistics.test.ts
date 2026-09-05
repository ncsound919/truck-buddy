import { parseFieldLogisticsDocument, validatePodCompletion } from '@/domain/field-logistics';

describe('field logistics document parsing', () => {
  it('extracts generic warehouse and delivery fields', () => {
    const record = parseFieldLogisticsDocument(`
      Load ID: LOAD-100001
      BOL: BOL-200001
      Customer Order: ORDER-300001
      Staging: B24
      Pallet Count: 3
      Cabs: 24
      Damage/Shorts: none
      In-home delivery with mattress removal and liftgate
    `);

    expect(record.loadId).toBe('LOAD-100001');
    expect(record.bolNumber).toBe('BOL-200001');
    expect(record.orderNumbers).toEqual(['ORDER-300001']);
    expect(record.stagingLocations).toContain('B24');
    expect(record.palletCount).toBe(3);
    expect(record.cabCount).toBe(24);
    expect(record.hasDamageOrShortage).toBe(true);
    expect(record.accessorials).toEqual(expect.arrayContaining(['inside_delivery', 'mattress_removal', 'liftgate']));
  });

  it('deduplicates repeated staging and order values', () => {
    const record = parseFieldLogisticsDocument('Order: ORDER-300001; Order: ORDER-300001; Bay: A12; Location: A12');
    expect(record.orderNumbers).toEqual(['ORDER-300001']);
    expect(record.stagingLocations).toEqual(['A12']);
  });
});

describe('POD completion validation', () => {
  it('requires verified location and delivery evidence', () => {
    expect(validatePodCompletion({ locationVerified: true, photoUri: 'file://pod.jpg' })).toEqual({
      complete: true,
      missing: [],
    });

    expect(validatePodCompletion({ locationVerified: true })).toEqual({
      complete: false,
      missing: ['photo_or_signature', 'exception_reason'],
    });
  });

  it('allows an explicit documented exception in place of photo or signature', () => {
    expect(validatePodCompletion({ locationVerified: true, exceptionReason: 'Customer declined signature' })).toEqual({
      complete: true,
      missing: [],
    });
  });
});
