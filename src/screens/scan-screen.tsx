import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Pill } from '@/components/ui';
import { Brand, useIsDark } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import type { DocumentType, TruckDocument } from '@/domain/types';
import { useFlow } from '@/store/flow';
import { haptic } from '@/services/haptics';
import { announce } from '@/services/voice';
import { buildOcrDocument, recognizeImageText } from '@/services/ocr';

const DOC_TYPES: DocumentType[] = ['BOL', 'DeliveryReceipt', 'Invoice'];

/**
 * Document capture (wireframe E).
 *
 * Two OCR paths:
 *  - Native dev build: a real expo-camera live preview. Capture takes a photo
 *    and runs Google ML Kit on-device OCR (react-native-mlkit-ocr) to read the
 *    actual text. Verified fields are best-effort extractions of that text.
 *  - Expo Go / web / fallback: the framed stand-in running the mock API OCR so
 *    the attach flow stays fully exercisable without a dev build.
 */
export function ScanScreen() {
  const flow = useFlow();
  const { state, currentStop, cancelScan, openScan, capture, completeStop, commitCapture, sendDocEmail, readBackDoc } =
    flow;
  const dark = useIsDark();
  const [type, setType] = useState<DocumentType>('BOL');

  const nativeLive = Platform.OS !== 'web';
  const [live, setLive] = useState(nativeLive);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions({ get: true });
  const camRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  if (!currentStop) return null;

  const busy = state.scanning || ocrBusy;
  const verified = state.lastScan as TruckDocument | null;
  const forwardTarget = state.prefs?.docForwardToContactId
    ? state.contacts.find((c) => c.id === state.prefs?.docForwardToContactId) ?? null
    : null;

  const switchToDemo = () => {
    haptic('selection');
    setLive(false);
  };

  const doCaptureLive = async () => {
    const cam = camRef.current;
    if (!cam) {
      haptic('reject');
      switchToDemo();
      return;
    }
    setOcrBusy(true);
    haptic('confirm');
    try {
      const photo = await cam.takePictureAsync({ quality: 0.7 });
      const uri = photo.uri;
      setPhotoUri(uri);
      const lines = await recognizeImageText(uri);
      if (lines && lines.length) {
        const doc = buildOcrDocument(type, currentStop.id, currentStop.name, uri, lines);
        commitCapture(doc);
      } else {
        announce('No text found. Bring the document closer and try again.');
        setPhotoUri(null);
        haptic('reject');
      }
    } catch {
      haptic('reject');
      announce('Camera capture failed.');
    } finally {
      setOcrBusy(false);
    }
  };

  const doCaptureDemo = () => {
    haptic('confirm');
    announce(`Scanning ${type}`);
    void capture(type);
  };

  const captureReady = !busy;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: dark ? '#FFFFFF' : '#101828' }]}>Scan {type}</Text>
          <Pressable onPress={cancelScan} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={[styles.context, { color: dark ? '#8FA1BB' : '#5B6575' }]}>
          {currentStop.name}
        </Text>

        {verified ? null : (
          <View style={styles.camera}>
            {live && permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                ref={camRef}
                facing="back"
                autofocus="on"
                onCameraReady={() => {}}
                onMountError={() => {
                  announce('Camera unavailable — switching to demo capture.');
                  setLive(false);
                }}
              />
            ) : null}

            {live && !permission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.cameraHint}>Camera permission needed</Text>
                <Text style={styles.cameraSub}>Allow camera to scan paperwork live</Text>
                <View style={styles.permissionActions}>
                  <Pressable style={styles.permBtn} onPress={() => void requestPermission()}>
                    <Text style={styles.permBtnText}>Allow</Text>
                  </Pressable>
                  <Pressable style={styles.permGhost} onPress={switchToDemo}>
                    <Text style={styles.permGhostText}>Use demo capture</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!live ? (
              <>
                <View style={[styles.corners, styles.cornerTL]} />
                <View style={[styles.corners, styles.cornerTR]} />
                <View style={[styles.corners, styles.cornerBL]} />
                <View style={[styles.corners, styles.cornerBR]} />
                <Text style={styles.cameraHint}>Auto-capture enabled</Text>
                <Text style={styles.cameraSub}>Hold the document inside the frame (demo mode)</Text>
              </>
            ) : null}
          </View>
        )}

        {verified ? (
          <View style={styles.verifiedScroll}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            ) : null}
            <View style={styles.verifiedCard}>
              <Pill dot="success" label={live ? 'Verified · on-device OCR' : 'Verified · demo OCR'} />
              <Text style={[styles.bolNumber, { color: dark ? '#FFFFFF' : '#101828' }]}>
                {verified.parsedFields.bol_number}
              </Text>
              <Text style={styles.verifiedMeta}>
                {verified.parsedFields.shipper} → {verified.parsedFields.consignee}
              </Text>
              <Text style={styles.verifiedMeta}>
                {verified.parsedFields.weight > 0
                  ? `${verified.parsedFields.weight.toLocaleString()} lbs · `
                  : ''}
                {verified.parsedFields.date}
              </Text>
              <View style={styles.verifiedActions}>
                <BigButton label="Attach & Complete Stop" tone="success" onPress={completeStop} />
                <View style={styles.aidRow}>
                  <Text style={styles.aidLink} onPress={() => readBackDoc(verified)}>
                    🔊 Read it back
                  </Text>
                  <Text style={styles.aidLink} onPress={() => void sendDocEmail(verified)}>
                    📧 Email to {forwardTarget?.label ?? 'dispatch'}
                  </Text>
                </View>
                <Text
                  style={styles.attachAnother}
                  onPress={() => {
                    haptic('selection');
                    setPhotoUri(null);
                    openScan();
                  }}>
                  Re-capture document
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.typeRow}>
              {DOC_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setType(t);
                    haptic('selection');
                  }}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}>
                  <Text style={[styles.typeChipLabel, type === t && styles.typeChipLabelActive]}>
                    {t === 'BOL' ? 'Bill of Lading' : t}
                  </Text>
                </Pressable>
              ))}
            </View>

            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={Brand.accent} />
                <Text style={styles.busyText}>
                  {live ? 'Reading document (on-device OCR)…' : 'Running OCR pipeline…'}
                </Text>
              </View>
            ) : (
              <View style={styles.captureBlock}>
                <BigButton
                  label={live ? 'Capture Document' : 'Capture Document'}
                  sublabel={
                    live
                      ? 'Thumb tap to snap · real OCR'
                      : 'Thumb tap to snap (demo pipeline)'
                  }
                  busy={ocrBusy}
                  disabled={!captureReady}
                  onPress={live ? () => void doCaptureLive() : doCaptureDemo}
                />
                {live && (
                  <Text style={styles.demoLink} onPress={switchToDemo}>
                    OCR not working here? Use demo capture →
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  cancel: { fontSize: 16, fontWeight: '800', color: Brand.accent, paddingVertical: 8, paddingLeft: 16 },
  context: { fontSize: 15, fontWeight: '700' },
  camera: {
    height: 300,
    borderRadius: 28,
    backgroundColor: '#0B1626',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corners: { position: 'absolute', width: 44, height: 44, borderColor: '#4D6FFE' },
  cornerTL: { top: 18, left: 18, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  cameraHint: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  cameraSub: { color: '#8FA1BB', fontSize: 14, fontWeight: '600', marginTop: 6, paddingHorizontal: 24, textAlign: 'center' },
  permissionBox: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  permissionActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  permBtn: { backgroundColor: Brand.accent, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  permGhost: { paddingHorizontal: 8, justifyContent: 'center' },
  permGhostText: { color: '#8FA1BB', fontSize: 13, fontWeight: '700' },
  preview: { width: '100%', height: 170, borderRadius: 20, marginBottom: Spacing.three },
  verifiedScroll: { flex: 1 },
  verifiedCard: { gap: Spacing.one },
  bolNumber: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  verifiedMeta: { fontSize: 15, fontWeight: '600', color: '#5B6575', lineHeight: 22 },
  verifiedActions: { marginTop: Spacing.three, gap: Spacing.two },
  aidRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.two },
  aidLink: { fontSize: 14, fontWeight: '800', color: Brand.accent, paddingVertical: 8 },
  attachAnother: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: Brand.accent, paddingVertical: 10 },
  typeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#E8EDF4' },
  typeChipActive: { backgroundColor: Brand.accent },
  typeChipLabel: { fontSize: 13, fontWeight: '800', color: '#33415A' },
  typeChipLabelActive: { color: '#FFFFFF' },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: 12 },
  busyText: { fontSize: 15, fontWeight: '700', color: '#5B6575' },
  captureBlock: { gap: Spacing.one },
  demoLink: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#5B6575', paddingVertical: 8 },
});
