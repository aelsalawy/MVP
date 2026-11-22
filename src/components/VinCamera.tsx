/**
 * VIN camera component (Car Tracker MVP — T2.1).
 *
 * Thin wrapper around expo-camera's `CameraView` that:
 *  - requests camera permission on mount (permission-guarded view),
 *  - renders a VIN frame overlay to help the user align the barcode/plate,
 *  - exposes a torch (flashlight) toggle via `enableTorch`,
 *  - captures a still via `takePictureAsync` (no OCR here — T7.x owns OCR).
 *
 * EAS / native config: expo-camera ships as a native module; it is added to
 * the `plugins` array in app.json (see `"expo-camera"` entry). No additional
 * permissions block is required beyond the camera permission, which Expo
 * configures automatically from the plugin (iOS NSCameraUsageDescription is
 * set via `ios.infoPlist` if a custom message is desired — optional).
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radius, spacing, typography } from '../design/theme';

export interface VinCameraProps {
  /** Called with the local URI of a captured photo (jpg). */
  onCapture: (uri: string) => void;
  /** Called when the user wants to fall back to manual VIN entry. */
  onManualFallback?: () => void;
}

type TorchState = 'off' | 'on';

export const VinCamera: React.FC<VinCameraProps> = ({ onCapture, onManualFallback }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<TorchState>('off');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) onCapture(photo.uri);
    } finally {
      setCapturing(false);
    }
  }, [capturing, onCapture]);

  if (!permission) {
    // Permission state still resolving.
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[300]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access required</Text>
        <Text style={styles.body}>
          Allow camera access to scan your VIN, or enter it manually below.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant camera access</Text>
        </Pressable>
        {onManualFallback && (
          <Pressable style={styles.ghostBtn} onPress={onManualFallback}>
            <Text style={styles.ghostBtnText}>Enter VIN manually</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch === 'on'}
      />

      {/* VIN alignment frame overlay */}
      <View style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <Text style={styles.frameHint}>Align VIN barcode within the frame</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, torch === 'on' && styles.controlBtnActive]}
          onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))}
        >
          <Text style={styles.controlBtnText}>{torch === 'on' ? '🔦 On' : '🔦 Off'}</Text>
        </Pressable>
        <Pressable style={styles.captureBtn} onPress={handleCapture} disabled={capturing}>
          {capturing ? (
            <ActivityIndicator color={colors.background.base} />
          ) : (
            <View style={styles.captureBtnInner} />
          )}
        </Pressable>
        {onManualFallback && (
          <Pressable style={styles.controlBtn} onPress={onManualFallback}>
            <Text style={styles.controlBtnText}>Manual</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.fontSize.lg, fontWeight: '600' },
  body: { color: colors.text.secondary, fontSize: typography.fontSize.base, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  primaryBtnText: { color: colors.background.base, fontWeight: '600', fontSize: typography.fontSize.base },
  ghostBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  ghostBtnText: { color: colors.primary[300], fontWeight: '600', fontSize: typography.fontSize.base },

  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '82%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    position: 'relative',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: colors.primary[300] },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.lg },
  frameHint: {
    position: 'absolute',
    bottom: -spacing.xl,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  controls: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.lg,
  },
  controlBtn: {
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtnActive: { backgroundColor: colors.primary[600] },
  controlBtnText: { color: colors.text.primary, fontWeight: '600', fontSize: typography.fontSize.base },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.text.primary },
});
