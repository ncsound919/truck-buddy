import { DEMO_INSPECTION_ITEMS } from '@/domain/data';
import { inspectionBackStep } from '@/domain/inspection';
import type { InspectionEntry } from '@/domain/types';

function entry(itemId: string, passed: boolean): InspectionEntry {
  return { itemId, passed, at: new Date().toISOString() };
}

describe('inspectionBackStep (regression: previous item removed the current answer)', () => {
  it('removes the stale answer of the item being reopened', () => {
    const answered = [entry('tires', true), entry('brakes', false), entry('lights', true)];
    const next = inspectionBackStep(answered, 3);
    expect(next.inspectionIndex).toBe(2);
    expect(next.entries.map((e) => e.itemId)).toEqual(['tires', 'brakes']);
  });

  it('re-answering after back produces exactly one entry per item (no duplicates)', () => {
    let index = 0;
    let entries: InspectionEntry[] = [];
    const answer = (passed: boolean) => {
      entries = [...entries, entry(DEMO_INSPECTION_ITEMS[index].id, passed)];
      index += 1;
    };

    answer(true); // tires
    answer(false); // brakes
    answer(true); // lights

    const back = inspectionBackStep(entries, index);
    entries = back.entries;
    index = back.inspectionIndex;

    answer(false); // lights reported again with a different answer
    expect(entries.filter((e) => e.itemId === 'lights')).toHaveLength(1);
    expect(entries.find((e) => e.itemId === 'lights')?.passed).toBe(false);
    expect(entries).toHaveLength(3);
  });

  it('does nothing at the start of the walk-around', () => {
    expect(inspectionBackStep([], 0)).toEqual({ entries: [], inspectionIndex: 0 });
  });

  it('removes a failing answer so the redo is the only record (DVIR is not contradictory)', () => {
    let entries = [entry('tires', false)];
    const next = inspectionBackStep(entries, 1);
    expect(next.entries).toEqual([]);
    expect(next.inspectionIndex).toBe(0);
  });
});
