import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../src/theme';
import { createVisitor } from '../src/api';

export default function VisitorForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [purpose, setPurpose] = useState('');
  const [personToMeet, setPersonToMeet] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to capture a photo.');
        return;
      }
    }
    setCameraOpen(true);
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    const pic = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    if (pic?.base64) {
      setPhoto(`data:image/jpeg;base64,${pic.base64}`);
      setCameraOpen(false);
    }
  };

  const submit = async () => {
    if (!fullName.trim() || !mobile.trim() || !purpose.trim()) {
      Alert.alert('Missing fields', 'Full Name, Mobile and Purpose are required.');
      return;
    }
    if (!/^[0-9]{6,15}$/.test(mobile.trim())) {
      Alert.alert('Invalid mobile', 'Please enter a valid mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const v = await createVisitor({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        purpose: purpose.trim(),
        person_to_meet: personToMeet.trim(),
        photo_base64: photo,
      });
      router.replace({ pathname: '/success', params: { id: v.id, mobile: v.mobile } });
    } catch (e: any) {
      Alert.alert('Submit failed', e?.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (cameraOpen) {
    return (
      <View style={s.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View style={s.cameraTopBar}>
          <TouchableOpacity
            testID="camera-close-btn"
            onPress={() => setCameraOpen(false)}
            style={s.cameraCloseBtn}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.cameraBottomBar}>
          <TouchableOpacity
            testID="camera-capture-btn"
            onPress={capture}
            style={s.shutter}
            activeOpacity={0.8}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.flex}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        testID="visitor-form-scroll"
      >
        <View style={s.header}>
          <Ionicons name="qr-code-outline" size={36} color={colors.textPrimary} />
          <Text style={s.title} testID="visitor-form-title">
            Visitor Entry Form
          </Text>
          <Text style={s.subtitle}>Please fill in your details to request entry.</Text>
        </View>

        <Field label="Full Name *">
          <TextInput
            testID="visitor-name-input"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            placeholderTextColor={colors.textTertiary}
            style={s.input}
            autoCapitalize="words"
          />
        </Field>

        <Field label="Mobile Number *">
          <TextInput
            testID="visitor-mobile-input"
            value={mobile}
            onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, ''))}
            placeholder="9876543210"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            style={s.input}
            maxLength={15}
          />
        </Field>

        <Field label="Purpose of Visit *">
          <TextInput
            testID="visitor-purpose-input"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Meeting, Delivery, Interview..."
            placeholderTextColor={colors.textTertiary}
            style={s.input}
          />
        </Field>

        <Field label="Person to Meet">
          <TextInput
            testID="visitor-person-input"
            value={personToMeet}
            onChangeText={setPersonToMeet}
            placeholder="Name of host"
            placeholderTextColor={colors.textTertiary}
            style={s.input}
          />
        </Field>

        <Field label="Photo">
          <View style={s.photoRow}>
            <View style={s.photoPreview}>
              {photo ? (
                <Image source={{ uri: photo }} style={s.photoImg} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
              )}
            </View>
            <TouchableOpacity
              testID="capture-photo-btn"
              style={s.secondaryBtn}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color={colors.textPrimary} />
              <Text style={s.secondaryBtnText}>{photo ? 'Retake' : 'Capture Photo'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <TouchableOpacity
          testID="submit-visitor-btn"
          style={[s.primaryBtn, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <View style={s.footerLinks}>
          <TouchableOpacity testID="goto-status-btn" onPress={() => router.push('/status')}>
            <Text style={s.linkText}>Check status</Text>
          </TouchableOpacity>
          <Text style={s.dot}>•</Text>
          <TouchableOpacity testID="goto-admin-btn" onPress={() => router.push('/admin')}>
            <Text style={s.linkText}>Admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { alignItems: 'flex-start', marginBottom: spacing.lg, gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '500', fontSize: 15 },
  primaryBtn: {
    height: 54,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  linkText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' },
  dot: { color: colors.textTertiary },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  cameraTopBar: { position: 'absolute', top: 50, left: 16, right: 16 },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
