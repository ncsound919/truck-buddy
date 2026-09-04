import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Pill } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { profileLabel } from '@/domain/profile';
import { useOperatingProfile } from '@/hooks/use-operating-profile';
import { useFlow } from '@/store/flow';

/** Home / pre-shift screen (wireframe A). */
export function IdleScreen() {
  const flow = useFlow();
  const { driverName, vehicle, startShift, state } = flow;
  const { profile, ready } = useOperatingProfile();
  const dark = useIsDark();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmExt, setConfirmExt] = useState(false);
  const stops = state.route?.stops ?? [];
  const routeSummary = stops.map((s) => s.name.split(' ')[0]).join(' → ');
  const totalMiles = stops.reduce((a, s) => a + s.legMiles, 0);
  const prefs = state.prefs;
  const forwardTarget = prefs?.docForwardToContactId
    ? state.contacts.find((c) => c.id === prefs.docForwardToContactId) ?? null
    : null;
  const closeTools = () => {
    setToolsOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <Image
            source={require('@/../assets/images/truckbuddy-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Truck Buddy logo"
          />
          <Text style={[styles.greeting, { color: dark ? '#FFFFFF' : '#101828' }]}>
            Good morning{driverName ? `, ${driverName}` : ''}
          </Text>
          <Pill
            dot="success"
            label={`Membership · ${(state.session?.driver.membershipTier ?? 'basic').toUpperCase()}`}
          />
          {ready ? (
            <Pill label={profileLabel(profile)} dot="accent" onPress={() => router.push('/profile')} />
          ) : null}
        </View>

        <BigButton label="Start Shift" onPress={startShift} />

        {vehicle ? (
          <View style={[styles.card, dark ? styles.cardDark : styles.cardLight]}>
            <Text style={styles.cardKicker}>VEHICLE</Text>
            <Text style={[styles.vehicleLine, { color: dark ? '#FFFFFF' : '#101828' }]}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
            <Text style={styles.vehicleMeta}>
              Plate {vehicle.plate} · VIN ····{vehicle.vin.slice(-4)}
            </Text>
          </View>
        ) : null}

        {routeSummary ? (
          <View style={[styles.card, dark ? styles.cardDark : styles.cardLight]}>
            <Text style={styles.cardKicker}>TODAY{'\u2019'}S ROUTE</Text>
            <Text style={[styles.routeTitle, { color: dark ? '#FFFFFF' : '#101828' }]}>
              {routeSummary}
            </Text>
            <Text style={styles.vehicleMeta}>
              {stops.length} stops · {totalMiles} miles · {stops[0]?.etaMinutes ?? 0} min to first stop
            </Text>
          </View>
        ) : null}

        <View style={styles.hintRow}>
          <Text style={styles.hint}>Swipe up to start · Hold anywhere for voice</Text>
          <Pressable onPress={() => setToolsOpen(true)}>
            <Text style={styles.debugLink}>My tools · memory &amp; auto-help</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/debug')}>
            <Text style={styles.debugLink}>Developer · inspect live state</Text>
          </Pressable>
        </View>
      </View>

      <Modal transparent animationType="slide" visible={toolsOpen} onRequestClose={closeTools}>
        <Pressable style={styles.backdrop} onPress={closeTools}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>My tools</Text>

            <ScrollView contentContainerStyle={styles.sheetScroll}>
              <Text style={styles.sectionKicker}>Auto-pilot</Text>
              <View style={styles.sectionCard}>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Auto-pilot on</Text>
                  <Switch
                    value={!!prefs?.autoMode}
                    onValueChange={(v) => flow.setPref({ autoMode: v })}
                    trackColor={{ true: Brand.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Forward docs on capture</Text>
                  <Switch
                    value={!!prefs?.forwardDocsOnAttach}
                    onValueChange={(v) => flow.setPref({ forwardDocsOnAttach: v })}
                    trackColor={{ true: Brand.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Send end-of-day report</Text>
                  <Switch
                    value={!!prefs?.sendEodReport}
                    onValueChange={(v) => flow.setPref({ sendEodReport: v })}
                    trackColor={{ true: Brand.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.noteText}>
                  Scan → auto-forward paperwork · end shift → auto fleet report · fault → fleet alert.
                </Text>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Send email through the live server</Text>
                  <Switch
                    value={prefs?.dispatchTransport === 'live'}
                    onValueChange={(v) => flow.setPref({ dispatchTransport: v ? 'live' : 'mock' })}
                    trackColor={{ true: Brand.warning }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.noteText}>
                  {prefs?.dispatchTransport === 'live'
                    ? 'Live: emails go through the Supabase function → Resend. Off if the server is down.'
                    : 'Mock: emails only land in the in-app activity log. Flip on when the function is configured.'}
                </Text>
              </View>

              <Text style={styles.sectionKicker}>Auto-help</Text>
              <View style={styles.sectionCard}>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Text on arrival</Text>
                  <Switch
                    value={!!prefs?.autoNotifyOnArrival}
                    onValueChange={(v) => flow.setPref({ autoNotifyOnArrival: v })}
                    trackColor={{ true: Brand.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Read back after scan</Text>
                  <Switch
                    value={!!prefs?.readBackOnCapture}
                    onValueChange={(v) => flow.setPref({ readBackOnCapture: v })}
                    trackColor={{ true: Brand.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <Text style={styles.sectionKicker}>Third-party messages</Text>
              <View style={styles.sectionCard}>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: '#FFFFFF' }]}>Text the consignee on arrival</Text>
                  <Switch
                    value={!!prefs?.notifyConsigneeOnArrival}
                    onValueChange={(v) => {
                      if (v) {
                        setConfirmExt(true);
                      } else {
                        flow.setPref({ notifyConsigneeOnArrival: false });
                      }
                    }}
                    trackColor={{ true: Brand.warning }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {confirmExt ? (
                  <View style={styles.extCard}>
                    <Text style={styles.extWarn}>
                      This sends an arrival text to an OUTSIDE company (the consignee) when you
                      dock. It includes your name and unit so it isn&rsquo;t impersonation. It is off by
                      default. Detention claims are never sent automatically.
                    </Text>
                    <View style={styles.extActions}>
                      <Pressable
                        style={[styles.extBtn, { backgroundColor: Brand.warning }]}
                        onPress={() => {
                          flow.setPref({ notifyConsigneeOnArrival: true });
                          setConfirmExt(false);
                        }}>
                        <Text style={styles.extBtnText}>Enable</Text>
                      </Pressable>
                      <Pressable
                        style={styles.extGhost}
                        onPress={() => setConfirmExt(false)}>
                        <Text style={styles.extGhostText}>Keep off</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              <Text style={styles.sectionKicker}>Paperwork email · {forwardTarget?.label ?? 'none set'}</Text>
              <View style={styles.sectionCard}>
                <Pressable
                  style={styles.pickRow}
                  onPress={() => flow.setPref({ docForwardToContactId: null })}>
                  <Text style={styles.pickLabel}>No auto-forward</Text>
                  <Text style={styles.pickActive}>{!forwardTarget ? '✓' : ''}</Text>
                </Pressable>
                {state.contacts
                  .filter((c) => c.email)
                  .map((c) => (
                    <Pressable
                      key={c.id}
                      style={styles.pickRow}
                      onPress={() => flow.setPref({ docForwardToContactId: c.id })}>
                      <Text style={styles.pickLabel}>{c.label}</Text>
                      <Text style={styles.pickActive}>
                        {prefs?.docForwardToContactId === c.id ? '✓' : ''}
                      </Text>
                    </Pressable>
                  ))}
              </View>

              <Text style={styles.sectionKicker}>Remembered stops · GPS memory</Text>
              {state.rememberedStops.length ? (
                <View style={styles.sectionCard}>
                  {state.rememberedStops.map((s) => (
                    <View key={s.id} style={styles.memRow}>
                      <View style={styles.memInfo}>
                        <Text style={styles.memName}>{s.name}</Text>
                        <Text style={styles.memMeta}>{s.address}</Text>
                        {s.note ? <Text style={styles.memNote}>“{s.note}”</Text> : null}
                      </View>
                      <View style={styles.memRight}>
                        <Text style={styles.memUses}>{s.uses}×</Text>
                        <Pressable onPress={() => flow.forgetRememberedStop(s.id)} hitSlop={10}>
                          <Text style={styles.memRemove}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No stops saved yet. Use “Remember this stop” on arrival.</Text>
              )}

              <Text style={styles.sectionKicker}>Recent activity</Text>
              {state.aidLog.length ? (
                <View style={styles.sectionCard}>
                  {state.aidLog.slice(0, 4).map((d) => (
                    <View key={d.id} style={styles.activityRow}>
                      <Text style={styles.activitySubject}>
                        {d.kind === 'email' ? '📧' : d.kind === 'sms' ? '💬' : '📞'} {d.subject}
                      </Text>
                      <Text style={styles.activityMeta}>{d.to.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Nothing sent yet this session.</Text>
              )}
            </ScrollView>

            <Pressable onPress={closeTools} style={styles.closeBtn}>
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
  body: { flex: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' },
  hero: { gap: Spacing.three, marginBottom: Spacing.two },
  logo: { width: '100%', height: 180, alignSelf: 'center' },
  greeting: { fontSize: 40, fontWeight: '800', lineHeight: 46 },
  card: { borderRadius: 24, padding: Spacing.four, gap: Spacing.one },
  cardLight: { backgroundColor: '#F0F3F8' },
  cardDark: { backgroundColor: '#16233A' },
  cardKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: Brand.accent, marginBottom: 4 },
  vehicleLine: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  routeTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  vehicleMeta: { fontSize: 14, fontWeight: '600', color: '#5B6575', lineHeight: 20 },
  hintRow: { alignItems: 'center', gap: Spacing.three },
  hint: { fontSize: 13, fontWeight: '600', color: '#8A94A6', textAlign: 'center' },
  debugLink: { fontSize: 13, fontWeight: '700', color: Brand.accent, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,18,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '86%',
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: Spacing.two },
  sheetScroll: { gap: Spacing.two, paddingBottom: Spacing.two },
  sectionKicker: {
    color: '#6E7F97', fontSize: 12, fontWeight: '800', letterSpacing: 1.1,
    textTransform: 'uppercase', marginTop: Spacing.two,
  },
  sectionCard: { backgroundColor: Brand.surfaceRaised, borderRadius: 20, paddingHorizontal: Spacing.three },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, gap: Spacing.three,
  },
  toggleLabel: { fontSize: 16, fontWeight: '800' },
  noteText: { color: '#8FA1BB', fontSize: 12, fontWeight: '600', lineHeight: 17, paddingBottom: Spacing.three },
  extCard: { paddingBottom: Spacing.three, gap: Spacing.two },
  extWarn: { color: '#E4B95B', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  extActions: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', marginTop: Spacing.one },
  extBtn: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  extBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  extGhost: { paddingVertical: 8 },
  extGhostText: { color: '#8FA1BB', fontSize: 13, fontWeight: '700' },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#263349',
  },
  pickLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pickActive: { color: Brand.success, fontSize: 18, fontWeight: '800' },
  memRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#263349', gap: Spacing.three,
  },
  memInfo: { flex: 1, gap: 2 },
  memName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  memMeta: { color: '#8FA1BB', fontSize: 12.5, fontWeight: '600' },
  memNote: { color: '#8FA1BB', fontSize: 12.5, fontWeight: '600', fontStyle: 'italic', marginTop: 2 },
  memRight: { alignItems: 'center', gap: 4 },
  memUses: { color: '#8FA1BB', fontSize: 12, fontWeight: '700' },
  memRemove: { color: '#C7D2E0', fontSize: 15, fontWeight: '800', padding: 4 },
  emptyText: { color: '#6E7F97', fontSize: 13, fontWeight: '600', paddingVertical: Spacing.three },
  activityRow: {
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#263349', gap: 2,
  },
  activitySubject: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  activityMeta: { color: '#8FA1BB', fontSize: 12.5, fontWeight: '600' },
  closeBtn: { alignItems: 'center', paddingVertical: Spacing.three },
  closeText: { color: Brand.accent, fontSize: 16, fontWeight: '800' },
});
