import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { DEMO_INSPECTION_ITEMS } from '@/domain/data';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { announce } from '@/services/voice';

/**
 * DVIR sign-off (on-site). After the inspection walk-around the driver reviews
 * the report and certifies it. The certified report is retained on-device and
 * surfaces in the compliance dashboard (49 CFR 396.11).
 */
export function DvirScreen() {
  const flow = useFlow();
  const { dvir, certifyDvir, dvirBack } = flow;
  const dark = useIsDark();
  const isPostTrip = dvir?.scope === 'posttrip';

  if (!dvir) return null;

  // Only claim the fleet was alerted when a repair dispatch actually left the
  // device. In demo/mock transport (and when auto-alerts are off) it did not.
  const repairAlertSent = flow.state.aidLog.some(
    (d) => d.category === 'repair' && d.status === 'sent',
  );

  const labelFor = (itemId: string) =>
    DEMO_INSPECTION_ITEMS.find((i) => i.id === itemId)?.label ?? itemId;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Kicker text={isPostTrip ? 'POST-TRIP DVIR' : 'PRE-TRIP DVIR'} />
        <Text style={[styles.headline, { color: dark ? '#FFFFFF' : '#101828' }]}>
          Inspection complete
        </Text>
        <Text style={[styles.sub, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
          {dvir.vehicleLabel} · reviewed {dvir.entries.length} item
          {dvir.entries.length === 1 ? '' : 's'}
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, dark ? styles.cardDark : styles.cardLight]}>
            {dvir.entries.map((e) => (
              <View key={e.itemId} style={styles.itemRow}>
                <Text
                  style={[
                    styles.itemMark,
                    { color: e.passed ? Brand.success : Brand.danger },
                  ]}>
                  {e.passed ? '✓' : '✗'}
                </Text>
                <Text style={[styles.itemLabel, { color: dark ? '#FFFFFF' : '#101828' }]}>
                  {labelFor(e.itemId)}
                </Text>
                {!e.passed ? (
                  <Text style={styles.itemNote}>{e.issueNote ?? 'Issue noted'}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {dvir.defects.length ? (
            <View style={styles.defectCard}>
              <Text style={styles.defectTitle}>
                {dvir.defects.length} DEFECT{dvir.defects.length === 1 ? '' : 'S'} NOTED
              </Text>
              {dvir.defects.map((d) => (
                <Text key={d.itemId} style={styles.defectLine}>
                  • {d.label}
                  {d.note ? ` — ${d.note}` : ''}
                </Text>
              ))}
              <Text style={styles.defectNote}>
                {repairAlertSent
                  ? 'The fleet has been alerted. Defects must be repaired before the next dispatch per your carrier’s policy.'
                  : 'Report these defects to your carrier before the next dispatch, per your carrier’s policy. No alert was sent from this device.'}
              </Text>
            </View>
          ) : (
            <View style={styles.clearCard}>
              <Text style={styles.clearText}>No defects found.</Text>
            </View>
          )}

          <Text style={[styles.certText, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
            I certify that I inspected this vehicle and that the above report is
            true and complete. Any defects or deficiencies have been noted.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <BigButton
            label="Certify & sign"
            sublabel="Swipe up also certifies"
            tone="success"
            onPress={certifyDvir}
          />
          <Text
            style={styles.back}
            onPress={() => {
              haptic('selection');
              announce('Back to inspection.');
              dvirBack();
            }}>
            ← back to inspection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  card: { borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  cardLight: { backgroundColor: '#F0F3F8' },
  cardDark: { backgroundColor: '#16233A' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#263349',
  },
  itemMark: { fontSize: 18, fontWeight: '800', width: 24, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '800' },
  itemNote: { fontSize: 12, fontWeight: '600', color: Brand.danger, maxWidth: 110, textAlign: 'right' },
  defectCard: { backgroundColor: '#3A1414', borderRadius: 20, padding: Spacing.three, gap: 6 },
  defectTitle: { color: '#FF8A8A', fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  defectLine: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  defectNote: { color: '#E7B6B6', fontSize: 12.5, fontWeight: '600', lineHeight: 18, marginTop: 4 },
  clearCard: { backgroundColor: '#0E2A1C', borderRadius: 20, padding: Spacing.three },
  clearText: { color: '#8FE0B3', fontSize: 15, fontWeight: '800' },
  certText: { fontSize: 13.5, fontWeight: '600', lineHeight: 20, fontStyle: 'italic' },
  actions: { gap: Spacing.two },
  back: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#5B6575', paddingVertical: 8 },
});
