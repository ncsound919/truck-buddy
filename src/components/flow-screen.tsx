import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GestureSurface } from '@/components/gesture-surface';
import { VoiceCommand, VoicePalette } from '@/components/voice-palette';
import { DEMO_INSPECTION_ITEMS } from '@/domain/data';
import { ArrivedScreen } from '@/screens/arrived-screen';
import { IdleScreen } from '@/screens/idle-screen';
import { InspectionScreen } from '@/screens/inspection-screen';
import { NavigateScreen } from '@/screens/navigate-screen';
import { ScanScreen } from '@/screens/scan-screen';
import { EndedScreen, SummaryScreen } from '@/screens/shift-end-screen';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { announce } from '@/services/voice';

/**
 * One screen, driven by the workflow state machine (spec 2.5). The gesture
 * layer maps swipes to the *next logical action* for the current step, so the
 * driver rarely needs to look at the screen at all.
 */
export function FlowScreen() {
  const flow = useFlow();
  const { state } = flow;
  const [voiceOpen, setVoiceOpen] = useState(false);

  const voiceCommands = useMemo<VoiceCommand[]>(() => {
    const list: VoiceCommand[] = [];
    const s = state.step;
    const stopName = flow.currentStop?.name.split(' ')[0] ?? 'stop';

    if (s === 'idle') {
      list.push({ label: 'Start shift', run: flow.startShift });
    }
    if (s === 'pretrip' || s === 'posttrip') {
      const item = DEMO_INSPECTION_ITEMS[state.inspectionIndex]?.label ?? 'item';
      list.push({
        label: `Pass ${item}`,
        run: () => {
          flow.inspectionPass();
          announce(`${item} passed.`);
        },
      });
      list.push({ label: `Issue on ${item}`, run: () => flow.inspectionIssue('Voice note') });
      if (state.inspectionIndex > 0) {
        list.push({
          label: 'Previous item',
          run: () => {
            flow.inspectionBack();
            announce('Previous item.');
          },
        });
      }
    }
    if (s === 'navigating') {
      list.push({ label: `Arrive at ${stopName}`, run: flow.arrive });
    }
    if (s === 'arrived') {
      list.push({ label: 'Complete stop', run: flow.completeStop });
      list.push({
        label: 'Scan paperwork',
        run: () => {
          flow.openScan();
          announce('Opening scanner.');
        },
      });
      list.push({ label: 'Text: I have arrived', run: () => void flow.notifyArrival() });
      if (flow.stopHasDocument && state.lastScan) {
        const doc = state.lastScan;
        list.push({
          label: 'Email paperwork',
          hint: `BOL ${doc.parsedFields.bol_number}`,
          run: () => void flow.sendDocEmail(doc),
        });
        list.push({ label: 'Read bill of lading', run: () => flow.readBackDoc(doc) });
      }
      list.push({ label: 'Remember this stop', run: () => flow.rememberCurrentStop() });
      list.push({
        label: 'Back on road',
        run: () => {
          flow.backOnRoad();
          announce('Back on road.');
        },
      });
    }
    if (s === 'scan') {
      list.push({ label: 'Capture document (BOL)', run: () => void flow.capture('BOL') });
      if (state.lastScan) {
        const doc = state.lastScan;
        list.push({ label: 'Read bill of lading', run: () => flow.readBackDoc(doc) });
        list.push({ label: 'Email paperwork', run: () => void flow.sendDocEmail(doc) });
      }
    }
    if (s === 'summary') {
      list.push({ label: 'End shift', run: flow.endShift });
    }
    list.push({
      label: 'Check truck health',
      run: () => {
        const msg = flow.readTruckHealth();
        if (msg) {
          haptic(msg.startsWith('Truck') ? 'selection' : 'alert');
          announce(msg);
        }
      },
    });
    list.push({
      label: flow.onBreak ? 'End break' : 'Start a 30-min break',
      run: () => (flow.onBreak ? flow.endBreak() : flow.startBreak()),
    });
    return list;
  }, [state.step, state.inspectionIndex, state.lastScan, flow]);

  const openVoice = () => {
    haptic('confirm');
    setVoiceOpen(true);
  };

  const screen = (() => {
    switch (state.step) {
      case 'idle':
        return <IdleScreen />;
      case 'pretrip':
      case 'posttrip':
        return <InspectionScreen />;
      case 'navigating':
        return <NavigateScreen />;
      case 'arrived':
        return <ArrivedScreen />;
      case 'scan':
        return <ScanScreen />;
      case 'summary':
        return <SummaryScreen />;
      case 'ended':
        return <EndedScreen />;
      default:
        return null;
    }
  })();

  // Per-step swipe mapping.
  const nextAction = (() => {
    switch (state.step) {
      case 'idle':
        return flow.startShift;
      case 'pretrip':
      case 'posttrip':
        return flow.inspectionPass;
      case 'navigating':
        return flow.arrive;
      case 'arrived':
        return flow.completeStop;
      case 'summary':
        return flow.endShift;
      default:
        return undefined;
    }
  })();

  const prevAction = (() => {
    switch (state.step) {
      case 'pretrip':
      case 'posttrip':
        return state.inspectionIndex > 0 ? flow.inspectionBack : undefined;
      case 'arrived':
        return flow.backOnRoad;
      case 'scan':
        return flow.cancelScan;
      default:
        return undefined;
    }
  })();

  return (
    <GestureSurface
      disabled={state.scanning}
      onNext={nextAction}
      onPrev={prevAction}
      onLongPressVoice={openVoice}>
      <View style={styles.fill}>{screen}</View>
      {voiceOpen ? (
        <VoicePalette commands={voiceCommands} onClose={() => setVoiceOpen(false)} />
      ) : null}
    </GestureSurface>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
