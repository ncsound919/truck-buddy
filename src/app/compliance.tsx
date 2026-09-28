import { router } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Kicker, Pill } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { minutesToClock } from '@/domain/data';
import {
  buildContractCompliance,
  PROGRAM_LABEL,
  STATUS_LABEL,
  VERDICT_LABEL,
} from '@/domain/contract';
import type { ComplianceStatus } from '@/domain/contract';
import { useNow } from '@/hooks/use-now';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';

const statusColor = (status: ComplianceStatus): string =>
  status === 'active'
    ? Brand.success
    : status === 'due_soon'
      ? Brand.warning
      : Brand.danger;

const verdictColor = (v: 'legal' | 'attention' | 'at_risk'): string =>
  v === 'legal' ? Brand.success : v === 'attention' ? Brand.warning : Brand.danger;

/**
 * Compliance dashboard — the in-app, audit-ready view. Aggregates HOS,
 * DVIR history, detention, documents and vehicle health into one record the
 * driver can review on demand or share with fleet/safety.
 */
export default function ComplianceScreen() {
  const flow = useFlow();
  const dark = useIsDark();
  const now = useNow(1000);
  const hos = flow.hosStatus(now);

  const activeContract = flow.contract;
  const dossier = flow.dossier;
  const otherContracts =
    activeContract && dossier && flow.contracts.length > 1
      ? flow.contracts
          .filter((c) => c.id !== activeContract.id)
          .map((c) => ({ contract: c, post: buildContractCompliance(c, dossier) }))
      : [];

  const violationColor =
    hos.violation === 'none'
      ? Brand.success
      : hos.violation === 'warning'
        ? Brand.warning
        : Brand.danger;
  const violationLabel =
    hos.violation === 'none'
      ? 'Compliant'
      : hos.violation === 'warning'
        ? 'Approaching limit'
        : hos.violation === 'break'
          ? 'Break required'
          : hos.violation === 'drive'
            ? 'Drive limit reached'
            : 'On-duty limit reached';

  const share = async () => {
    haptic('selection');
    try {
      await Share.share({ message: flow.exportCompliance() });
    } catch {
      // Sharing unavailable (web preview) — the record is still shown on screen.
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <Kicker text="Compliance" />
          <Pressable onPress={() => router.back()}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#101828' }]}>
          Audit record
        </Text>
        <Text style={[styles.sub, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
          {flow.driverName} · {flow.vehicle ? `${flow.vehicle.year} ${flow.vehicle.make} ${flow.vehicle.model}` : '—'}
        </Text>

        <Pill
          dot={hos.violation === 'none' ? 'success' : 'warning'}
          label={violationLabel}
        />

        <Text style={styles.kicker}>HOURS OF SERVICE</Text>
        <View style={styles.card}>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Drive</Text>
            <Text style={[styles.hosValue, { color: violationColor }]}>
              {minutesToClock(hos.driveMinutes)} / {minutesToClock(hos.driveLimitMinutes)}
            </Text>
          </View>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>On duty</Text>
            <Text style={[styles.hosValue, { color: violationColor }]}>
              {minutesToClock(hos.onDutyMinutes)} / {minutesToClock(hos.onDutyLimitMinutes)}
            </Text>
          </View>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Break</Text>
            <Text style={styles.hosValue}>
              {hos.onBreak
                ? `${hos.breakRemainingMinutes}m left`
                : hos.breakRequired
                  ? 'Required now'
                  : 'Not needed'}
            </Text>
          </View>
          {hos.messages.length ? (
            <View style={styles.warnBox}>
              {hos.messages.map((m) => (
                <Text key={m} style={styles.warnText}>
                  {m}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {flow.contract && flow.contractCompliance ? (
          <>
            <Text style={styles.kicker}>CONTRACT · {flow.contract.counterparty.toUpperCase()}</Text>
            <View style={styles.card}>
              <View style={styles.hosRow}>
                <View style={styles.dvirInfo}>
                  <Text style={styles.dvirScope}>{PROGRAM_LABEL[flow.contract.program]}</Text>
                  <Text style={styles.dvirMeta}>
                    {[flow.contract.lane, flow.contract.dot].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.dvirStatus,
                    { color: verdictColor(flow.contractCompliance.verdict) },
                  ]}>
                  {VERDICT_LABEL[flow.contractCompliance.verdict]}
                </Text>
              </View>
              {flow.contractCompliance.requirements.map((r) => (
                <View key={r.itemId} style={styles.reqRow}>
                  <View style={styles.dvirInfo}>
                    <Text style={styles.reqTitle}>{r.title}</Text>
                    <Text style={styles.dvirMeta}>{r.spec}</Text>
                  </View>
                  <Text style={[styles.dvirStatus, { color: statusColor(r.status) }]}>
                    {STATUS_LABEL[r.status]}
                  </Text>
                </View>
              ))}
              {flow.contractCompliance.blockers.length ? (
                <View style={styles.warnBox}>
                  {flow.contractCompliance.blockers.map((b) => (
                    <Text key={b} style={styles.warnText}>
                      Blocked: {b}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>

            {otherContracts.length ? (
              <>
                <Text style={styles.kicker}>OTHER MAJOR-COMPANY CONTRACTS</Text>
                <View style={styles.card}>
                  {otherContracts.map(({ contract: c, post }) => (
                    <View key={c.id} style={styles.reqRow}>
                      <View style={styles.dvirInfo}>
                        <Text style={styles.reqTitle}>{c.counterparty}</Text>
                        <Text style={styles.dvirMeta}>
                          {PROGRAM_LABEL[c.program]} · {c.requirements.length} requirements
                        </Text>
                      </View>
                      <Text style={[styles.dvirStatus, { color: verdictColor(post.verdict) }]}>
                        {VERDICT_LABEL[post.verdict]}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        <Text style={styles.kicker}>INSPECTIONS · DVIR</Text>
        <View style={styles.card}>
          {flow.dvirReports.length ? (
            flow.dvirReports.slice(0, 8).map((r) => (
              <View key={r.id} style={styles.dvirRow}>
                <View style={styles.dvirInfo}>
                  <Text style={styles.dvirScope}>{r.scope.toUpperCase()}</Text>
                  <Text style={styles.dvirMeta}>
                    {new Date(r.completedAt).toLocaleString()}
                    {r.certifiedAt ? ' · certified' : ' · pending'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.dvirStatus,
                    { color: r.defects.length ? Brand.danger : Brand.success },
                  ]}>
                  {r.defects.length ? `${r.defects.length} defect` : 'Clean'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No inspections yet this session.</Text>
          )}
        </View>

        <Text style={styles.kicker}>RUN RECORD</Text>
        <View style={styles.card}>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Detention</Text>
            <Text style={styles.hosValue}>
              {flow.detentionTotalMinutes}m · {flow.detentionCount} stop{flow.detentionCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Documents</Text>
            <Text style={styles.hosValue}>{flow.state.docs.length} captured</Text>
          </View>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Stops</Text>
            <Text style={styles.hosValue}>
              {flow.completedStopCount}/{flow.totalStopCount}
            </Text>
          </View>
          <View style={styles.hosRow}>
            <Text style={styles.hosLabel}>Vehicle health</Text>
            <Text style={styles.hosValue}>{flow.readTruckHealth() ?? '—'} · sample</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.shareBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={share}>
          <Text style={styles.shareText}>Share / export compliance record</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Share opens the full text record so you can email it to safety, dispatch
          or a roadside officer. A real build signs and timestamps this record.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 80 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: Brand.accent, fontSize: 15, fontWeight: '800' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 15, fontWeight: '600' },
  kicker: { color: '#6E7F97', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: Spacing.two },
  card: { backgroundColor: Brand.surfaceRaised, borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  hosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#263349', gap: Spacing.three,
  },
  hosLabel: { color: '#8FA1BB', fontSize: 15, fontWeight: '700' },
  hosValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  warnBox: { paddingVertical: Spacing.two, gap: 4 },
  warnText: { color: '#E4B95B', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  reqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#263349', gap: Spacing.two,
  },
  reqTitle: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  dvirRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#263349',
  },
  dvirInfo: { gap: 2, flex: 1 },
  dvirScope: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  dvirMeta: { color: '#8FA1BB', fontSize: 12, fontWeight: '600' },
  dvirStatus: { fontSize: 14, fontWeight: '800' },
  empty: { color: '#6E7F97', fontSize: 13, fontWeight: '600', paddingVertical: Spacing.three },
  shareBtn: { backgroundColor: Brand.accent, borderRadius: 999, paddingVertical: Spacing.three, alignItems: 'center' },
  shareText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  footnote: { color: '#6E7F97', fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
