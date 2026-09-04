import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Kicker } from '@/components/ui';
import { useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import {
  AUTHORITY,
  AUTHORITY_LABEL,
  EQUIPMENT,
  profileLabel,
  ROLES,
  type AuthorityId,
  type EquipmentId,
  type OperatingProfile,
  type RoleId,
} from '@/domain/profile';
import { useOperatingProfile } from '@/hooks/use-operating-profile';

/** One-tap work-setup screen, mirroring the web portal's perspective picker. */
export default function ProfileScreen() {
  const { profile, ready, setOperatingProfile } = useOperatingProfile();
  const [draft, setDraft] = useState<OperatingProfile | null>(null);
  const dark = useIsDark();
  const active = draft ?? profile;

  const set = (patch: Partial<OperatingProfile>) => setDraft({ ...active, ...patch });
  const canSave = draft != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#101828' }]}>How you work</Text>
        {ready ? <Text style={styles.sub}>{profileLabel(profile)}</Text> : <Text style={styles.sub}>Loading…</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Group label="Your role">
          {ROLES.map(([k, l]) => (
            <Option key={k} label={l} active={active.role === k} onPress={() => set({ role: k as RoleId })} />
          ))}
        </Group>

        <Group label="What you run">
          {EQUIPMENT.map(([k, l]) => (
            <Option key={k} label={l} active={active.equipment === k} onPress={() => set({ equipment: k as EquipmentId })} />
          ))}
        </Group>

        <Group label="Who holds the authority">
          {AUTHORITY.map(([k, l]) => (
            <Option key={k} label={l} active={active.authority === k} onPress={() => set({ authority: k as AuthorityId })} />
          ))}
        </Group>
      </ScrollView>

      <View style={styles.footer}>
        <BigButton
          label={canSave ? 'Save my work setup' : 'No changes'}
          tone={canSave ? 'primary' : 'secondary'}
          onPress={async () => {
            if (!canSave) return;
            await setOperatingProfile(active);
            router.back();
          }}
        />
        <Pressable onPress={() => router.back()} style={styles.cancelWrap}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const dark = useIsDark();
  return (
    <View style={styles.group}>
      <Kicker text={label} />
      <View style={[styles.box, { backgroundColor: dark ? '#16233A' : '#F0F3F8' }]}>{children}</View>
    </View>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const dark = useIsDark();
  const color = dark ? '#FFFFFF' : '#101828';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: dark ? '#263349' : '#E0E5EC' },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optLabel, { color }]}>{label}</Text>
      <Text style={[styles.check, { color: active ? '#0F6BFF' : '#9AA7B8' }]}>{active ? '✓' : '○'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: 4 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 14, fontWeight: '600', color: '#5B6575' },
  scroll: { padding: Spacing.four, gap: Spacing.four },
  group: { gap: Spacing.two },
  box: { borderRadius: 20, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optLabel: { fontSize: 15, fontWeight: '700', flexShrink: 1, paddingRight: Spacing.two },
  check: { fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.6 },
  footer: { padding: Spacing.four, gap: Spacing.three },
  cancelWrap: { alignItems: 'center', paddingVertical: Spacing.two },
  cancel: { color: '#0F6BFF', fontSize: 15, fontWeight: '700' },
});
