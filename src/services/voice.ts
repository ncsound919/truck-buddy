import * as Speech from 'expo-speech';

/**
 * Voice guidance wrapper (spec: hands-free mode, voice assistant).
 * expo-speech is text-to-speech only. Spoken *commands* (STT) are not part of
 * this slice — long-press voice mode shows a spoken prompt + tappable command
 * chips instead, so the interaction layer is real while recognition lands.
 */

let muted = false;

export function setVoiceMuted(value: boolean): void {
  muted = value;
}

export function isVoiceMuted(): boolean {
  return muted;
}

export function announce(text: string, interrupt = true): void {
  if (muted || !text) return;
  if (interrupt) {
    Speech.stop().catch(() => {});
  }
  try {
    Speech.speak(text, { rate: 0.95, pitch: 1 });
  } catch {
    // Speech engine unavailable (e.g. some emulator images) — degrade silently.
  }
}

export function stopVoice(): void {
  Speech.stop().catch(() => {});
}
