import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker, StatCard } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { announce } from '@/services/voice';
import { useNow } from '@/hooks/use-now';

/** End-of-day summary (wireframe F) + post-shift state. */
export function SummaryScreen() {
  const flow = useFlow();
  const { state, completedStopCount, totalStopCount, vehicle, endShift, readTruckHealth } = flow;
  const dark = useIsDark();
  const now = useNow(1000);
  const docCount = state.docs.length;
  const mileage = state.route?.stops
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + s.legMiles, 0) ?? 0;
  const health = readTruckHealth();
  const healthOk = health?.startsWith('Truck') ?? false;
  const dutyMin = flow.onDutyMinutesAt(now);
  const triage = flow.faultTriage();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Kicker text="Shift complete" />
        <Text style={[styles.headline, { color: dark ? '#FFFFFF' : '#101828' }]}>
          Great work today{flow.driverName ? `, ${flow.driverName}` : ''}.
        </Text>

        <View style={styles.statsRow}>
          <StatCard value={`${completedStopCount}/${totalStopCount}`} label="Stops" accent />
          <StatCard value={`${docCount}`} label="Docs scanned" />
          <StatCard value={mileage ? `${mileage} mi` : '—'} label="Mileage" />
        </View>

        <View style={styles.runRow}>
          <View style={styles.runCell}>
            <Text style={styles.runKicker}>ON DUTY</Text>
            <Text style={styles.runBig}>
              {Math.floor(dutyMin / 60)}h {String(dutyMin % 60).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.runCell}>
            <Text style={styles.runKicker}>DETENTION</Text>
            <Text style={styles.runBig}>{flow.detentionTotalMinutes}m</Text>
            <Text style={styles.runSub}>{flow.detentionCount} stop{flow.detentionCount === 1 ? '' : 's'} logged</Text>
          </View>
          <View style={styles.runCell}>
            <Text style={styles.runKicker}>FAULT</Text>
            <Text style={[styles.runBig, { color: triage.severity === 'ok' ? Brand.success : triage.severity === 'caution' ? Brand.warning : Brand.danger }]}>
              {triage.severity === 'ok' ? 'Clear' : triage.severity === 'caution' ? 'Caution' : 'Stop'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (health) {
              haptic(healthOk ? 'selection' : 'alert');
              announce(health);
            }
          }}
          style={({ pressed }) => [
            styles.healthRow,
            dark ? styles.cardDark : styles.cardLight,
            pressed && styles.pressed,
          ]}>
          <View style={[styles.healthDot, { backgroundColor: healthOk ? Brand.success : Brand.danger }]} />
          <View style={styles.healthTextWrap}>
            <Text style={styles.healthLabel}>Vehicle health</Text>
            <Text style={[styles.healthValue, { color: healthOk ? (dark ? '#FFFFFF' : '#101828') : Brand.danger }]}>
              {health ?? 'Loading…'}
            </Text>
            <Text style={styles.healthTap}>Tap to hear again</Text>
          </View>
        </Pressable>

        {vehicle ? (
          <Text style={[styles.vehicleLine, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
            {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.plate}
          </Text>
        ) : null}

        <BigButton label="End Shift" onPress={endShift} />
      </View>
    </SafeAreaView>
  );
}

export function EndedScreen() {
  const flow = useFlow();
  const dark = useIsDark();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.body, styles.centered]}>
        <View style={styles.doneRing}>
          <Text style={styles.doneMark}>✓</Text>
        </View>
        <Text style={[styles.headline, styles.centerText, { color: dark ? '#FFFFFF' : '#101828' }]}>
          Shift Logged
        </Text>
        <Text style={[styles.muted, styles.centerText]}>
          Report synced to the fleet portal. Drive safe.
        </Text>
        <View style={styles.spacer} />
        <BigButton label="Restart Demo Day" tone="secondary" onPress={flow.reset} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' },
  centered: { alignItems: 'stretch' },
  centerText: { textAlign: 'center' },
  headline: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -0.4 },
  muted: { fontSize: 16, fontWeight: '600', color: '#5B6575' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  runRow: { flexDirection: 'row', gap: Spacing.two, marginTop: -Spacing.one },
  runCell: {
    flex: 1, borderRadius: 20, padding: Spacing.three, gap: 2,
    backgroundColor: '#16233A',
  },
  runKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: Brand.accent },
  runBig: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  runSub: { fontSize: 12, fontWeight: '600', color: '#8FA1BB' },
  healthRow: { borderRadius: 24, padding: Spacing.three, flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  cardLight: { backgroundColor: '#F0F3F8' },
  cardDark: { backgroundColor: '#16233A' },
  pressed: { opacity: 0.85 },
  healthDot: { width: 14, height: 14, borderRadius: 7 },
  healthTextWrap: { flex: 1, gap: 2 },
  healthLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', color: Brand.accent },
  healthValue: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  healthTap: { fontSize: 12, fontWeight: '600', color: '#8A94A6' },
  vehicleLine: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  doneRing: {
    width: 96, height: 96, borderRadius: 48, alignSelf: 'center',
    backgroundColor: Brand.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three,
  },
  doneMark: { fontSize: 52, color: Brand.success, fontWeight: '800' },
  spacer: { flex: 1, minHeight: 40 },
});
