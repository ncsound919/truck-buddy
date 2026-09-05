import { useState } from 'react';
import { Modal, Pressable, StyleSheet, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Pill } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import type { Contact } from '@/domain/types';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { openCall, openEmail, openSms } from '@/services/outreach';
import { DISPATCH_TEMPLATES } from '@/domain/data';
import { useNow } from '@/hooks/use-now';

/**
 * Arrival at a stop (wireframe D). Triggered by the geofence engine (real GPS)
 * in real builds, or by simulated arrival. "Driver aids" bundles the one-handed
 * outreach + memory actions a driver reaches for the moment they dock.
 */
export function ArrivedScreen() {
  const flow = useFlow();
  const {
    state,
    currentStop,
    currentStopLabel,
    stopHasDocument,
    completeStop,
    openScan,
    backOnRoad,
    sendDocEmail,
    readBackDoc,
    rememberCurrentStop,
  } = flow;
  const dark = useIsDark();
  const [aidsOpen, setAidsOpen] = useState(false);
  const lastDoc = state.lastScan;
  const now = useNow(1000);
  const waitMin = state.arrivalAt
    ? Math.max(0, Math.floor((now - new Date(state.arrivalAt).getTime()) / 60000))
    : 0;
  if (!currentStop) return null;

  const contacts = state.contacts;
  const forwardTarget = state.prefs?.docForwardToContactId
    ? contacts.find((c) => c.id === state.prefs?.docForwardToContactId) ?? null
    : null;

  const close = () => {
    haptic('selection');
    setAidsOpen(false);
  };

  const contactRow = (c: Contact) => (
    <View key={c.id} style={styles.contactRow}>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactLabel, { color: dark ? '#FFFFFF' : '#101828' }]}>{c.label}</Text>
        <Text style={styles.contactRole}>{c.role.toUpperCase()}</Text>
      </View>
      <View style={styles.contactActions}>
        {c.phone ? (
          <>
            <Pressable style={styles.chipBtn} onPress={() => { haptic('selection'); openCall(c); }}>
              <Text style={styles.chipText}>Call</Text>
            </Pressable>
            <Pressable
              style={styles.chipBtn}
              onPress={() => {
                haptic('selection');
                openSms(c, DISPATCH_TEMPLATES.arrivedSms(currentStop!.name));
              }}>
              <Text style={styles.chipText}>Text</Text>
            </Pressable>
          </>
        ) : null}
        {c.email ? (
          <Pressable
            style={styles.chipBtn}
            onPress={() => {
              haptic('selection');
              openEmail(c, `Arrived at ${currentStop!.name}`, DISPATCH_TEMPLATES.arrivedSms(currentStop!.name));
            }}>
            <Text style={styles.chipText}>Email</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Pill
            dot="success"
            label={state.arrivalVia === 'gps' ? 'Geofence reached' : 'Arrived'}
          />
          <Text style={[styles.arrived, { color: dark ? '#FFFFFF' : '#101828' }]}>
            You Have Arrived
          </Text>
          <Text style={[styles.eyebrow, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
            {currentStopLabel.toUpperCase()}
          </Text>
          <Text style={[styles.stopName, { color: dark ? '#FFFFFF' : '#101828' }]}>
            {currentStop.name}
          </Text>
        </View>

        {lastDoc && stopHasDocument ? (
          <View style={styles.verifiedRow}>
            <Pill dot="success" label={`Paperwork verified · ${lastDoc.type}`} />
          </View>
        ) : null}

        {state.prefs?.autoNotifyOnArrival ? (
          <View style={styles.verifiedRow}>
            <Pill dot="accent" label="Auto-texting arrival · on" />
          </View>
        ) : null}

        {waitMin >= 1 ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitClock}>⏱ {waitMin} min waiting</Text>
            <Text style={styles.waitNote}>
              Logged as detention when you complete the stop — claimable proof for pay.
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <BigButton label="Complete Stop" onPress={completeStop} />
          <BigButton label="Scan Paperwork" tone="secondary" onPress={openScan} />
          <BigButton label="Driver Aids" tone="secondary" onPress={() => setAidsOpen(true)} />
          <Text style={[styles.backOnRoad, { color: dark ? '#8FA1BB' : '#5B6575' }]} onPress={backOnRoad}>
            Left the geofence? Back on road →
          </Text>
        </View>
      </View>

      <Modal transparent animationType="slide" visible={aidsOpen} onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Driver aids</Text>
              <Text style={styles.sheetSub}>{currentStop.name}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.sheetScroll}>
              <Text style={styles.sectionKicker}>One-tap reach</Text>
              <View style={styles.sectionCard}>{contacts.map(contactRow)}</View>

              {lastDoc && stopHasDocument ? (
                <>
                  <Text style={styles.sectionKicker}>Paperwork · {lastDoc.parsedFields.bol_number}</Text>
                  <View style={styles.actionsCard}>
                    <BigButton label="📧 Auto-email paperwork" sublabel={forwardTarget ? `To ${forwardTarget.label}` : 'Set a recipient in Tools → Memory'} tone="secondary" onPress={() => void sendDocEmail(lastDoc)} />
                    <BigButton label="🔊 Read it back" sublabel="Hear the verified fields" tone="secondary" onPress={() => readBackDoc(lastDoc)} />
                  </View>
                </>
              ) : null}

              <Text style={styles.sectionKicker}>Memory · GPS</Text>
              <View style={styles.actionsCard}>
                <BigButton label="📍 Remember this stop" sublabel="Save for future routes" tone="secondary" onPress={() => rememberCurrentStop()} />
                {state.rememberedStops.length ? (
                  <Pill dot="success" label={`${state.rememberedStops.length} stop(s) in memory`} />
                ) : null}
              </View>
            </ScrollView>

            <Pressable onPress={close} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  head: { gap: Spacing.three, marginTop: Spacing.five },
  arrived: { fontSize: 46, lineHeight: 52, fontWeight: '800', letterSpacing: -0.6 },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  stopName: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  verifiedRow: { alignItems: 'flex-start', marginVertical: Spacing.two },
  waitCard: {
    backgroundColor: '#FFF4E0', borderRadius: 18, padding: Spacing.three, gap: 4,
  },
  waitClock: { fontSize: 20, fontWeight: '800', color: Brand.warning },
  waitNote: { fontSize: 13, fontWeight: '600', color: '#7A5A20', lineHeight: 18 },
  actions: { gap: Spacing.three, paddingBottom: Spacing.four },
  backOnRoad: { textAlign: 'center', fontSize: 14, fontWeight: '700', paddingVertical: Spacing.two },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,18,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '84%',
  },
  sheetHead: { marginBottom: Spacing.three },
  sheetTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  sheetSub: { color: '#8FA1BB', fontSize: 14, fontWeight: '600', marginTop: 2 },
  sheetScroll: { gap: Spacing.two, paddingBottom: Spacing.three },
  sectionKicker: { color: '#6E7F97', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: Spacing.two },
  sectionCard: { backgroundColor: Brand.surfaceRaised, borderRadius: 20, paddingHorizontal: Spacing.three },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#263349',
  },
  contactInfo: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 16, fontWeight: '800' },
  contactRole: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#8FA1BB' },
  contactActions: { flexDirection: 'row', gap: Spacing.two },
  chipBtn: { backgroundColor: '#1E3252', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  actionsCard: { gap: Spacing.two },
  closeBtn: { alignItems: 'center', paddingVertical: Spacing.three },
  closeText: { color: Brand.accent, fontSize: 16, fontWeight: '800' },
});
