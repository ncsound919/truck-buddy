import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker } from '@/components/ui';
import { DEMO_INSPECTION_ITEMS } from '@/domain/data';
import { useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { announce } from '@/services/voice';

/**
 * Pre-trip / post-trip inspection (wireframe B).
 * One item at a time, huge buttons, full day's fail-path = PASS or ISSUE note.
 */
export function InspectionScreen() {
  const flow = useFlow();
  const { state, inspectionPass, inspectionIssue, inspectionBack } = flow;
  const dark = useIsDark();
  const isPostTrip = state.step === 'posttrip';
  const items = DEMO_INSPECTION_ITEMS;
  const index = state.inspectionIndex;
  const item = items[index];
  const progress = `${Math.min(index + 1, items.length)} of ${items.length}`;

  const reportIssue = () => {
    haptic('alert');
    inspectionIssue('Voice note');
    announce('Issue recorded.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Kicker text={isPostTrip ? 'POST-TRIP INSPECTION' : 'PRE-TRIP INSPECTION'} />
        <Text style={[styles.progress, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
          Item {progress}
        </Text>

        <View style={[styles.itemCard, dark ? styles.itemCardDark : styles.itemCardLight]}>
          <Text style={[styles.itemLabel, { color: dark ? '#FFFFFF' : '#101828' }]}>
            {item?.label ?? '—'}
          </Text>
        </View>

        <View style={styles.actions}>
          <BigButton label="Pass" sublabel="Swipe up also passes" tone="success" onPress={inspectionPass} />
          <BigButton
            label="Report issue"
            sublabel="Hold for voice note"
            tone="danger"
            onPress={() => reportIssue()}
          />
          {index > 0 ? (
            <Text style={styles.backHint} onPress={inspectionBack}>
              ← previous item
            </Text>
          ) : (
            <View style={styles.controlsHint}>
              <Text style={styles.backHint}>Swipe up = pass · Hold = issue</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  progress: { fontSize: 16, fontWeight: '700' },
  itemCard: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  itemCardLight: { backgroundColor: '#E4EDFF' },
  itemCardDark: { backgroundColor: '#16233A' },
  itemLabel: { fontSize: 44, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  actions: { gap: Spacing.three },
  backHint: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#5B6575', paddingVertical: 8 },
  controlsHint: { alignItems: 'center' },
});
