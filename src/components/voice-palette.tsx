import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/brand';
import { haptic } from '@/services/haptics';
import { announce, isVoiceMuted, setVoiceMuted } from '@/services/voice';

export interface VoiceCommand {
  label: string;
  hint?: string;
  run: () => void;
}

/**
 * Voice assistant surface (spec 2.1, "Long press = voice mode").
 * Long-press anywhere opens this command palette. Recognition (STT) is a later
 * backend/device service — today the driver taps a command or we speak it.
 */
export function VoicePalette({
  commands,
  onClose,
}: {
  commands: VoiceCommand[];
  onClose: () => void;
}) {
  const [muted, setMuted] = useState(isVoiceMuted());

  useEffect(() => {
    announce('Voice mode');
  }, []);

  const toggleMute = () => {
    const next = !isVoiceMuted();
    setVoiceMuted(next);
    setMuted(next);
    haptic('selection');
    if (!next) announce('Voice on');
  };

  const close = () => {
    haptic('selection');
    onClose();
  };

  const full = useMemo<VoiceCommand[]>(
    () => [
      ...commands,
      {
        label: muted ? 'Voice off' : 'Voice on',
        hint: 'Toggle spoken guidance',
        run: toggleMute,
      },
      { label: 'Close', run: close },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commands, muted],
  );

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Voice commands</Text>
          {full.map((cmd) => (
            <Pressable
              key={cmd.label}
              accessibilityRole="button"
              onPress={() => {
                haptic('confirm');
                cmd.run();
                onClose();
              }}
              style={({ pressed }) => [styles.command, pressed && styles.commandPressed]}>
              <Text style={styles.commandLabel}>{cmd.label}</Text>
              {cmd.hint ? <Text style={styles.commandHint}>{cmd.hint}</Text> : null}
            </Pressable>
          ))}
          <Text style={styles.hint}>Tap a command — speech recognition arrives with the voice service.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,18,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  command: {
    backgroundColor: Brand.surfaceRaised,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  commandPressed: { backgroundColor: '#1E3252' },
  commandLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  commandHint: { color: '#8FA1BB', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  hint: { color: '#6E7F97', fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 6 },
});
