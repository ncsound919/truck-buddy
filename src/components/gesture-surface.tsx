import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';

import { haptic } from '@/services/haptics';

/**
 * One-thumb gesture engine (spec 2.1):
 *   swipe up   -> next task / advance
 *   swipe down -> previous / back
 *   long press -> voice mode
 * Big on-screen buttons cover the "thumb tap = confirm" case per screen.
 */
export function GestureSurface({
  children,
  onNext,
  onPrev,
  onLongPressVoice,
  disabled,
}: PropsWithChildren<{
  onNext?: () => void;
  onPrev?: () => void;
  onLongPressVoice?: () => void;
  disabled?: boolean;
}>) {
  const gesture = Gesture.Exclusive(
    Gesture.Fling()
      .direction(Directions.UP)
      .numberOfPointers(1)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success && onNext) {
          haptic('selection');
          onNext();
        }
      }),
    Gesture.Fling()
      .direction(Directions.DOWN)
      .numberOfPointers(1)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success && onPrev) {
          haptic('selection');
          onPrev();
        }
      }),
    Gesture.LongPress()
      .minDuration(550)
      .runOnJS(true)
      .onStart(() => {
        if (onLongPressVoice) onLongPressVoice();
      }),
  );

  if (disabled) {
    return <View style={styles.fill}>{children}</View>;
  }
  // Swipe/long-press gestures are a one-handed *phone* interaction. On web the
  // GestureDetector swallows pointer events so normal Pressable clicks never
  // fire — so gate gestures to native and let web use the on-screen controls.
  if (Platform.OS === 'web') {
    return <View style={styles.fill}>{children}</View>;
  }
  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
