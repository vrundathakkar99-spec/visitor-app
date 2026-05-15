import React, { useMemo, useRef, useState } from 'react';
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
import {
  colors,
  radius,
  spacing,
  CATEGORIES,
  DEPARTMENT_EMPLOYEES,
  DEPARTMENTS_STAFF,
  DEPARTMENTS_FACTORY,
  MANAGEMENT_PERSONS,
  categoryColors,
  type VisitorCategory,
} from '../src/theme';
import { createVisitor } from '../src/api';
import { MaxwellHeader } from '../src/MaxwellLogo';

type Step = 'category' | 'sub';

export default function VisitorForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState<VisitorCategory>('staff_visit');
  const [department, setDepartment] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [customPerson, setCustomPerson] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const tint = categoryColors[category];

  const departmentList = useMemo(
    () => (category === 'factory_visit' ? DEPARTMENTS_FACTORY : DEPARTMENTS_STAFF),
    [category],
  );
  const employeeList = useMemo(
    () => (department && department !== 'Others' ? DEPARTMENT_EMPLOYEES[department] || [] : []),
    [department],
  );

  const handleCategoryChange = (next: VisitorCategory) => {
    setCategory(next);
    setDepartment(null);
    setAssignedTo(null);
    setCustomPerson('');
  };

  const handleDepartmentChange = (d: string) => {
    setDepartment(d);
    setAssignedTo(null);
    setCustomPerson('');
    // Auto-pick employee if there's only one
    if (d !== 'Others' && DEPARTMENT_EMPLOYEES[d]?.length === 1) {
      setAssignedTo(DEPARTMENT_EMPLOYEES[d][0]);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Camera permission required');
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
    // Build payload by category
    let payload: Parameters<typeof createVisitor>[0];
    if (category === 'management') {
      if (!assignedTo) {
        Alert.alert('Select person', 'Pick the management person to meet.');
        return;
      }
      payload = {
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        purpose: purpose.trim(),
        category,
        department: null,
        assigned_to: assignedTo,
        photo_base64: photo,
      };
    } else {
      if (!department) {
        Alert.alert('Select department', 'Pick a department first.');
        return;
      }
      let finalAssigned: string | null = assignedTo;
      if (department === 'Others') {
        if (!customPerson.trim()) {
          Alert.alert('Enter person name', 'Please enter the person you wish to meet.');
          return;
        }
        finalAssigned = customPerson.trim();
      } else if (!finalAssigned) {
        Alert.alert('Select employee', 'Pick the employee you want to meet.');
        return;
      }
      payload = {
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        purpose: purpose.trim(),
        category,
        department,
        assigned_to: finalAssigned,
        photo_base64: photo,
      };
    }
    setSubmitting(true);
    try {
      const v = await createVisitor(payload);
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
          <TouchableOpacity testID="camera-close-btn" onPress={() => setCameraOpen(false)} style={s.cameraCloseBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.cameraBottomBar}>
          <TouchableOpacity testID="camera-capture-btn" onPress={capture} style={s.shutter} activeOpacity={0.8} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      style={s.flex}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        testID="visitor-form-scroll"
      >
        <MaxwellHeader subtitle="Visitor Management" />

        <View style={s.header}>
          <Text style={s.title} testID="visitor-form-title">Visitor Entry Form</Text>
          <Text style={s.subtitle}>Please fill in your details to request entry.</Text>
        </View>

        <Field label="Full Name *">
          <TextInput testID="visitor-name-input" value={fullName} onChangeText={setFullName} placeholder="John Doe" placeholderTextColor={colors.textTertiary} style={s.input} autoCapitalize="words" returnKeyType="next" />
        </Field>

        <Field label="Mobile Number *">
          <TextInput testID="visitor-mobile-input" value={mobile} onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, ''))} placeholder="9876543210" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" style={s.input} maxLength={15} returnKeyType="next" />
        </Field>

        <Field label="Purpose of Visit *">
          <TextInput testID="visitor-purpose-input" value={purpose} onChangeText={setPurpose} placeholder="Meeting, Delivery, Interview..." placeholderTextColor={colors.textTertiary} style={s.input} returnKeyType="done" />
        </Field>

        <Field label="Visitor Category *">
          <View style={s.chipRow}>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              const ct = categoryColors[c.value];
              return (
                <TouchableOpacity
                  key={c.value}
                  testID={`category-option-${c.value}`}
                  onPress={() => handleCategoryChange(c.value)}
                  activeOpacity={0.85}
                  style={[s.chip, active && { backgroundColor: ct.bg, borderColor: ct.accent }]}
                >
                  <View style={[s.chipDot, { backgroundColor: active ? ct.accent : colors.textTertiary }]} />
                  <Text style={[s.chipText, active && { color: ct.text, fontWeight: '700' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        {category !== 'management' && (
          <Field label="Department *">
            <View style={s.chipRow}>
              {departmentList.map((d) => {
                const active = department === d;
                return (
                  <TouchableOpacity
                    key={d}
                    testID={`dept-option-${d}`}
                    onPress={() => handleDepartmentChange(d)}
                    activeOpacity={0.85}
                    style={[s.smallChip, active && { backgroundColor: tint.bg, borderColor: tint.accent }]}
                  >
                    <Text style={[s.smallChipText, active && { color: tint.text, fontWeight: '700' }]} numberOfLines={1}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        )}

        {category !== 'management' && department && department !== 'Others' && (
          <Field label="Person to Meet *">
            <View style={s.chipRow}>
              {employeeList.map((emp) => {
                const active = assignedTo === emp;
                return (
                  <TouchableOpacity
                    key={emp}
                    testID={`emp-option-${emp}`}
                    onPress={() => setAssignedTo(emp)}
                    activeOpacity={0.85}
                    style={[s.smallChip, active && { backgroundColor: tint.bg, borderColor: tint.accent }]}
                  >
                    <Text style={[s.smallChipText, active && { color: tint.text, fontWeight: '700' }]}>{emp}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        )}

        {category !== 'management' && department === 'Others' && (
          <Field label="Enter Person Name *">
            <TextInput
              testID="custom-person-input"
              value={customPerson}
              onChangeText={setCustomPerson}
              placeholder="Type the person's name"
              placeholderTextColor={colors.textTertiary}
              style={s.input}
              returnKeyType="done"
            />
          </Field>
        )}

        {category === 'management' && (
          <Field label="Management Person *">
            <View style={s.chipRow}>
              {MANAGEMENT_PERSONS.map((p) => {
                const active = assignedTo === p;
                return (
                  <TouchableOpacity
                    key={p}
                    testID={`mgmt-option-${p}`}
                    onPress={() => setAssignedTo(p)}
                    activeOpacity={0.85}
                    style={[s.smallChip, active && { backgroundColor: tint.bg, borderColor: tint.accent }]}
                  >
                    <Text style={[s.smallChipText, active && { color: tint.text, fontWeight: '700' }]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        )}

        <Field label="Photo">
          <View style={s.photoRow}>
            <View style={s.photoPreview}>
              {photo ? (
                <Image source={{ uri: photo }} style={s.photoImg} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
              )}
            </View>
            <TouchableOpacity testID="capture-photo-btn" style={s.secondaryBtn} onPress={openCamera} activeOpacity={0.8}>
              <Ionicons name="camera" size={18} color={colors.textPrimary} />
              <Text style={s.secondaryBtnText}>{photo ? 'Retake' : 'Capture Photo'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <TouchableOpacity testID="submit-visitor-btn" style={[s.primaryBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Submit Request</Text>}
        </TouchableOpacity>

        <View style={s.footerLinks}>
          <TouchableOpacity testID="goto-status-btn" onPress={() => router.push('/status')}>
            <Text style={s.linkText}>Check status</Text>
          </TouchableOpacity>
          <Text style={s.dot}>•</Text>
          <TouchableOpacity testID="goto-employee-btn" onPress={() => router.push('/employee/login')}>
            <Text style={s.linkText}>Employee login</Text>
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
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: {
    height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontSize: 15, backgroundColor: colors.surface, color: colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  smallChip: {
    paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smallChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoPreview: {
    width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.elevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', height: 52,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '500', fontSize: 15 },
  primaryBtn: {
    height: 54, backgroundColor: colors.primaryBg, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  footerLinks: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    gap: 10, marginTop: spacing.lg,
  },
  linkText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' },
  dot: { color: colors.textTertiary },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  cameraTopBar: { position: 'absolute', top: 50, left: 16, right: 16 },
  cameraCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBottomBar: {
    position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center',
  },
  shutter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#fff', borderWidth: 5, borderColor: 'rgba(255,255,255,0.4)',
  },
});
