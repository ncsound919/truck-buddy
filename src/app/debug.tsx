import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFlow } from '@/store/flow';
import { useIsDark } from '@/constants/brand';

/**
 * Developer diagnostic screen. Inspects live workflow state — the same reducer
 * state that drives the UI — so gestures/transitions can be verified quickly.
 */
export default function DebugScreen() {
  const flow = useFlow();
  const dark = useIsDark();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Kicker text="Developer · Debug" />
        <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#101828' }]}>Workflow state</Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>Step</Text>
        <Text style={styles.mono}>{flow.state.step}</Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>
          Inspection · index {flow.state.inspectionIndex} · scope {flow.state.inspectionScope}
        </Text>
        <Text style={styles.mono}>{JSON.stringify(flow.state.inspectionEntries, null, 2)}</Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>Stops</Text>
        <Text style={styles.mono}>
          {JSON.stringify(
            (flow.state.route?.stops ?? []).map((s) => ({ name: s.name, status: s.status })),
            null,
            2,
          )}
        </Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>Documents</Text>
        <Text style={styles.mono}>
          {JSON.stringify(flow.state.docs.map((d) => ({ type: d.type, bol: d.parsedFields.bol_number })), null, 2)}
        </Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>OBD sample</Text>
        <Text style={styles.mono}>
          {flow.state.obdSample ? JSON.stringify(flow.state.obdSample.metrics, null, 2) : 'null'}
        </Text>

        <Text style={[styles.label, { color: dark ? '#FFFFFF' : '#101828' }]}>Voice</Text>
        <Text style={styles.mono}>Truck health: {flow.readTruckHealth() ?? 'n/a'}</Text>

        <BigButton label="Reset demo day" tone="secondary" onPress={flow.reset} />

        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.back}>← Back to driver flow</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 80 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: Spacing.two },
  label: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginTop: Spacing.three },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#5B6575' },
  back: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#0F6BFF', paddingVertical: Spacing.three },
});
