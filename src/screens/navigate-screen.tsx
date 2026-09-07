import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker, Pill } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { stopOnSiteMinutes } from '@/domain/data';
import type { DestinationKind } from '@/domain/types';
import { useFlow } from '@/store/flow';
import { useNow } from '@/hooks/use-now';
import { announce } from '@/services/voice';
import { geofence, type GeoWatch } from '@/services/geo';

const DIM_AFTER_MS = 12_000;

/**
 * Hands-free navigation (wireframe C).
 * Screen auto-dims while driving. Arrival is either real GPS geofencing
 * (expo-location, native) or simulated — both funnel into the same workflow
 * action so the rest of the app is identical.
 */
export function NavigateScreen() {
  const flow = useFlow();
  const { state, currentStop, currentStopLabel, arrive, arriveViaGps, totalStopCount } = flow;
  const dark = useIsDark();
  const [dimmed, setDimmed] = useState(false);
  const dimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcedRef = useRef<string | null>(null);

  const gpsEnabledOnPlatform = Platform.OS !== 'web';
  const [gpsEnabled, setGpsEnabled] = useState(() => flow.state.prefs?.gpsEnabled ?? true);
  const [gpsState, setGpsState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [liveMeters, setLiveMeters] = useState<number | null>(null);
  const watchRef = useRef<GeoWatch | null>(null);

  const stopId = currentStop?.id ?? '';
  const now = useNow(1000);
  const dutyMin = flow.onDutyMinutesAt(now);
  const dutyTxt = `${Math.floor(dutyMin / 60)}h ${String(dutyMin % 60).padStart(2, '0')}`;
  const breakLeft = flow.breakRemainingMinutesAt(now);
  const triage = flow.faultTriage();

  const scheduleDim = () => {
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    dimTimerRef.current = setTimeout(() => setDimmed(true), DIM_AFTER_MS);
  };

  // Reset dimming whenever a new stop is targeted, then announce once per stop.
  useEffect(() => {
    if (state.step !== 'navigating' || !currentStop) return;
    if (announcedRef.current !== stopId) {
      announcedRef.current = stopId;
      const onSite = stopOnSiteMinutes(currentStop);
      const destCount = currentStop.destinations.length;
      announce(
        `Next stop: ${currentStop.name}. ` +
          (destCount > 0
            ? `${destCount} delivery point${destCount === 1 ? '' : 's'}, about ${onSite} minutes on site. `
            : '') +
          `Drive ETA ${currentStop.etaMinutes} minutes.`,
      );
    }
    dimTimerRef.current = setTimeout(() => {
      setDimmed(false);
      scheduleDim();
    }, 0);
    return () => {
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    };
  }, [state.step, stopId, currentStop]);

  // Real GPS geofence: when the truck enters the stop radius, auto-arrive.
  useEffect(() => {
    if (!gpsEnabled || !gpsEnabledOnPlatform || !currentStop) return;
    let cancelled = false;
    watchRef.current?.stop();
    void (async () => {
      const res = await geofence(
        { lat: currentStop.lat, lng: currentStop.lng },
        currentStop.geofenceMeters,
      );
      if (cancelled || !res) return;
      if (res.permission !== 'granted') {
        setGpsState('denied');
        return;
      }
      setGpsState('granted');
      watchRef.current = res.start(
        (m) => {
          if (!cancelled) setLiveMeters(m);
        },
        () => {
          if (!cancelled) arriveViaGps();
        },
      );
    })();
    return () => {
      cancelled = true;
      watchRef.current?.stop();
      watchRef.current = null;
      setLiveMeters(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsEnabled, stopId]);

  useEffect(() => () => {
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
    watchRef.current?.stop();
  }, []);

  const wake = () => {
    setDimmed(false);
    scheduleDim();
  };

  if (!currentStop) return null;

  const progressText = `${currentStop.sequence} of ${totalStopCount}`;
  const onSiteMin = stopOnSiteMinutes(currentStop);
  const totalMin = currentStop.etaMinutes + onSiteMin;
  const destCount = currentStop.destinations.length;

  const kindIcon: Record<DestinationKind, string> = {
    house: '🏠',
    building: '🏢',
    dock: '🚪',
    unit: '📍',
  };

  const gpsLine = (() => {
    if (!gpsEnabled) return null;
    if (gpsState === 'denied') return 'Location permission denied — using manual arrival.';
    if (gpsState === 'idle') return 'Starting GPS…';
    return liveMeters != null ? `${liveMeters} m to arrival` : 'Acquiring GPS…';
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Pressable style={styles.fill} onPress={wake}>
        <View style={[styles.body, dimmed && styles.dimmed]}>
          <View style={styles.headerRow}>
            <Kicker text="HANDS-FREE" />
            <Text style={[styles.progress, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
              {progressText}
            </Text>
          </View>

          <View style={styles.stopBlock}>
            <Text style={styles.eyebrow}>{currentStopLabel.toUpperCase()}</Text>
            <Text style={[styles.stopName, { color: dark ? '#FFFFFF' : '#101828' }]}>
              {currentStop.name}
            </Text>
            <Text style={[styles.address, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
              {currentStop.address}
            </Text>

            {destCount > 0 ? (
              <View style={[styles.destCard, dark ? styles.destCardDark : styles.destCardLight]}>
                <Text style={styles.destKicker}>
                  DELIVERY POINTS · {destCount} · ~{onSiteMin} MIN ON SITE
                </Text>
                {currentStop.destinations.map((d) => (
                  <View key={d.id} style={styles.destRow}>
                    <Text style={styles.destIcon}>{kindIcon[d.kind]}</Text>
                    <View style={styles.destInfo}>
                      <Text style={[styles.destLabel, { color: dark ? '#FFFFFF' : '#101828' }]}>
                        {d.label}
                      </Text>
                      {d.detail ? (
                        <Text style={styles.destDetail}>{d.detail}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.destTime}>{d.handlingMinutes}m</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.etaCard}>
              <Text style={styles.etaValue}>{totalMin}</Text>
              <View>
                <Text style={styles.etaUnit}>min total</Text>
                <Text style={styles.etaSub}>
                  {currentStop.etaMinutes}m drive · {onSiteMin}m on site
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Pill dot="accent" label="Voice guidance active" />
            <Pill dot="accent" label="Haptic alerts on" />
          </View>

          <View style={[styles.runBar, dark ? styles.runBarDark : styles.runBarLight]}>
            <View style={styles.runItem}>
              <Text style={styles.runLabel}>ON DUTY</Text>
              <Text style={[styles.runValue, { color: dark ? '#FFFFFF' : '#101828' }]}>{dutyTxt}</Text>
            </View>
            <View style={styles.runItem}>
              <Text style={styles.runLabel}>FAULT</Text>
              <Text
                style={[
                  styles.runValue,
                  { color: triage.severity === 'ok' ? Brand.success : triage.severity === 'caution' ? Brand.warning : Brand.danger },
                ]}>
                {triage.severity === 'ok' ? 'Clear' : triage.severity === 'caution' ? 'Caution' : 'Stop'}
              </Text>
            </View>
            <Pressable
              style={styles.runItem}
              onPress={() => (flow.onBreak ? flow.endBreak() : flow.startBreak())}>
              <Text style={styles.runLabel}>BREAK</Text>
              <Text style={[styles.runValue, { color: dark ? '#FFFFFF' : '#101828' }]}>
                {flow.onBreak ? `${breakLeft}m` : 'Take 30'}
              </Text>
              <Text style={styles.runSub}>{flow.onBreak ? 'Tap to end' : 'Tap to start'}</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <View style={[styles.gpsCard, dark ? styles.gpsCardDark : styles.gpsCardLight]}>
              <View style={styles.gpsRow}>
                <View style={styles.gpsTextWrap}>
                  <Text style={[styles.gpsTitle, { color: dark ? '#FFFFFF' : '#101828' }]}>Real GPS arrival</Text>
                  <Text style={styles.gpsSub}>
                    {gpsLine ?? (gpsEnabledOnPlatform ? 'Auto-detects when you reach the dock' : 'Web preview — arrival is simulated')}
                  </Text>
                </View>
                <Switch
                  value={gpsEnabled}
                  disabled={!gpsEnabledOnPlatform}
                  onValueChange={(v) => {
                    setGpsEnabled(v);
                    // Remember the choice so the next stop starts the same way.
                    flow.setPref({ gpsEnabled: v });
                    if (v) setGpsState('idle');
                  }}
                  trackColor={{ true: Brand.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <BigButton
              label={`Simulate arrival at ${currentStop.name.split(' ')[0]}`}
              sublabel={gpsEnabled && gpsState === 'granted' ? 'GPS on — simulate still available' : 'Real GPS geofencing is the production path'}
              onPress={arrive}
            />
          </View>
        </View>

        {dimmed ? (
          <View style={styles.dimOverlay} pointerEvents="box-only">
            <Text style={styles.dimText}>Screen dimmed — tap to wake</Text>
          </View>
        ) : null}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  body: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    justifyContent: 'space-between',
    opacity: 1,
  },
  dimmed: { opacity: 0.12 },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimText: { fontSize: 18, fontWeight: '700', color: '#8FA1BB' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { fontSize: 15, fontWeight: '800' },
  stopBlock: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: Brand.accent, textTransform: 'uppercase' },
  stopName: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -0.5 },
  address: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  destCard: { borderRadius: 18, padding: Spacing.three, gap: Spacing.two, marginTop: Spacing.two },
  destCardLight: { backgroundColor: '#F0F3F8' },
  destCardDark: { backgroundColor: '#16233A' },
  destKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: Brand.accent },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  destIcon: { fontSize: 16 },
  destInfo: { flex: 1, gap: 1 },
  destLabel: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  destDetail: { fontSize: 12, fontWeight: '600', color: '#8FA1BB', lineHeight: 16 },
  destTime: { fontSize: 13, fontWeight: '800', color: '#5B6575' },
  etaCard: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  etaValue: { fontSize: 72, fontWeight: '800', lineHeight: 76, color: Brand.accent },
  etaUnit: { fontSize: 20, fontWeight: '800', color: '#5B6575' },
  etaSub: { fontSize: 13, fontWeight: '700', color: '#8A94A6', marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  actions: { gap: Spacing.three },
  runBar: { flexDirection: 'row', borderRadius: 18, padding: Spacing.three, gap: Spacing.two },
  runBarLight: { backgroundColor: '#F0F3F8' },
  runBarDark: { backgroundColor: '#16233A' },
  runItem: { flex: 1, gap: 1, alignItems: 'flex-start' },
  runLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#8FA1BB' },
  runValue: { fontSize: 17, fontWeight: '800' },
  runSub: { fontSize: 10, fontWeight: '600', color: '#8A94A6' },
  gpsCard: { borderRadius: 20, padding: Spacing.three },
  gpsCardLight: { backgroundColor: '#F0F3F8' },
  gpsCardDark: { backgroundColor: '#16233A' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  gpsTextWrap: { flex: 1, gap: 2 },
  gpsTitle: { fontSize: 16, fontWeight: '800', color: '#101828' },
  gpsSub: { fontSize: 12.5, fontWeight: '600', color: '#5B6575', lineHeight: 17 },
});
