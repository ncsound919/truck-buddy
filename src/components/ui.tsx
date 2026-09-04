import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { haptic } from '@/services/haptics';

type Tone = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';

const TONE_FILL: Record<Tone, { bg: string; fg: string; border?: string; shadow?: boolean }> = {
  primary: { bg: Brand.accent, fg: '#FFFFFF', shadow: true },
  success: { bg: Brand.success, fg: '#FFFFFF', shadow: true },
  danger: { bg: Brand.danger, fg: '#FFFFFF', shadow: true },
  secondary: { bg: Brand.accentSoft, fg: Brand.accentInk },
  ghost: { bg: 'transparent', fg: Brand.accent },
};

const HEIGHT = 84;

/**
 * One-thumb, oversized action button (spec 2.1 / wireframes).
 * The driver's entire day runs through a few of these.
 */
export function BigButton({
  label,
  sublabel,
  tone = 'primary',
  busy,
  disabled,
  onPress,
  style,
}: {
  label: string;
  sublabel?: string;
  tone?: Tone;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const fill = TONE_FILL[tone];
  const isDisabled = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (isDisabled) return;
        haptic('selection');
        onPress();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: fill.bg, borderColor: fill.border },
        fill.shadow && styles.shadow,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      <View style={styles.labelRow}>
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.label, { color: fill.fg }]} numberOfLines={2}>
            {label}
          </Text>
        )}
      </View>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: tone === 'secondary' ? Brand.accentInk : '#FFFFFF' }]}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HEIGHT,
    borderRadius: 28,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 0,
  },
  shadow: {
    elevation: 6,
    shadowColor: Brand.accent,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  labelRow: { alignItems: 'center', justifyContent: 'center', minHeight: 32 },
  label: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
});

/** Small pill used for status chips (verified, hands-free, etc.). */
export function Pill({
  label,
  dot,
  onPress,
}: {
  label: string;
  dot?: 'success' | 'warning' | 'accent';
  onPress?: () => void;
}) {
  const dark = useIsDark();
  const dotColor =
    dot === 'success' ? Brand.success : dot === 'warning' ? Brand.warning : Brand.accent;
  const content = (
    <View style={[pillStyles.bg, dark && pillStyles.bgDark]}>
      {dot ? <View style={[pillStyles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[pillStyles.label, dark && pillStyles.labelDark]}>{label}</Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && pillStyles.pressed}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const pillStyles = StyleSheet.create({
  bg: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#E8EDF4' },
  bgDark: { backgroundColor: '#263349' },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#33415A' },
  labelDark: { color: '#C7D2E0' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.7 },
});

/** Uppercase eyebrow label. */
export function Kicker({ text, color }: { text: string; color?: string }) {
  return (
    <Text style={[kickerStyles.text, { color: color ?? Brand.accent }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

const kickerStyles = StyleSheet.create({
  text: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
});

export function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  const dark = useIsDark();
  return (
    <View style={[statStyles.card, dark ? statStyles.cardDark : statStyles.cardLight]}>
      <Text style={[statStyles.value, { color: accent ? Brand.accent : dark ? '#FFFFFF' : '#111827' }]}>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: dark ? '#8FA1BB' : '#5B6575' }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { borderRadius: 20, padding: Spacing.three, alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4, minHeight: 92 },
  cardLight: { backgroundColor: '#F0F3F8' },
  cardDark: { backgroundColor: '#16233A' },
  value: { fontSize: 30, fontWeight: '800', lineHeight: 36 },
  label: { fontSize: 13, fontWeight: '600' },
});
