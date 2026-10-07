import { DEMO_INSPECTION_ITEMS } from './data';
import type { InspectionEntry } from './types';

/**
 * Going one inspection item back must un-answer the item we return to.
 * Otherwise re-answering leaves two (possibly contradictory) DVIR entries
 * for the same item. Pure so it is unit-testable outside React Native.
 */
export function inspectionBackStep(
  entries: InspectionEntry[],
  inspectionIndex: number,
): { entries: InspectionEntry[]; inspectionIndex: number } {
  if (inspectionIndex <= 0) return { entries, inspectionIndex };
  const nextIndex = inspectionIndex - 1;
  const reopenedId = DEMO_INSPECTION_ITEMS[nextIndex]?.id;
  return {
    inspectionIndex: nextIndex,
    entries: entries.filter((e) => e.itemId !== reopenedId),
  };
}
