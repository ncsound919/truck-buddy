import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback semantics per spec 2.1:
 *   - route confirmation / task completion -> success/confirm pulse
 *   - selection/step change               -> subtle tick
 *   - vehicle alert                       -> warning
 *   - wrong/blocked action                -> error
 * All calls are fire-and-forget and safe on devices with no engine.
 */

export type HapticKind =
  | 'confirm'
  | 'taskComplete'
  | 'selection'
  | 'alert'
  | 'reject'
  | 'arrive';

/** Swallow both sync throws and async rejections — feedback must never break the flow. */
function safe(p: Promise<unknown>): void {
  p?.catch(() => {});
}

export function haptic(kind: HapticKind): void {
  try {
    switch (kind) {
      case 'confirm':
      case 'taskComplete':
        safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        break;
      case 'alert':
        safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        break;
      case 'reject':
        safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
        break;
      case 'arrive':
        // Distinct arrival: medium impact then success
        safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
        safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        break;
      case 'selection':
        safe(Haptics.selectionAsync());
        break;
    }
  } catch {
    // No haptic engine — never let feedback break the driver flow.
  }
}
