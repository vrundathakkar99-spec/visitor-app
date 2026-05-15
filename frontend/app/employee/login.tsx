import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../src/theme';
import { employeeLogin, saveSession } from '../../src/api';
import { MaxwellHeader } from '../../src/MaxwellLogo';

export default function EmployeeLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const { token, profile } = await employeeLogin(email.trim().toLowerCase(), password);
      await saveSession(token, profile);
      router.replace('/employee/dashboard');
    } catch (e: any) {
      Alert.alert('Login failed', 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <MaxwellHeader subtitle="Employee Portal" />

        <Text style={s.title}>Employee Login</Text>
        <Text style={s.subtitle}>Sign in with your official company email.</Text>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={s.label}>Email</Text>
          <TextInput
            testID="employee-email-input"
            value={email}
            onChangeText={setEmail}
            placeholder="nishit.patel@maxwell.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            returnKeyType="next"
          />

          <Text style={[s.label, { marginTop: spacing.md }]}>Password</Text>
          <View style={s.pwRow}>
            <TextInput
              testID="employee-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              style={[s.input, { flex: 1 }]}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            <TouchableOpacity
              testID="toggle-pw-btn"
              onPress={() => setShowPw((v) => !v)}
              style={s.eyeBtn}
            >
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          testID="employee-login-btn"
          onPress={submit}
          disabled={loading}
          style={[s.primaryBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} style={s.backBtn}>
          <Text style={s.link}>Back to visitor form</Text>
        </TouchableOpacity>

        <Text style={s.help}>
          Default password for seeded employees: <Text style={{ fontWeight: '700' }}>maxwell@123</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  input: {
    height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontSize: 15, backgroundColor: colors.surface, color: colors.textPrimary,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 52, height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: {
    height: 54, backgroundColor: colors.primaryBg, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg,
  },
  primaryBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  backBtn: { marginTop: spacing.md, alignSelf: 'center' },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
  help: { color: colors.textTertiary, fontSize: 12, marginTop: spacing.lg, textAlign: 'center' },
});
