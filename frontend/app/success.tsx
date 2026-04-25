import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../src/theme';

export default function Success() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams<{ mobile?: string }>();

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name="checkmark-circle" size={72} color={colors.approvedText} />
      </View>
      <Text style={s.title} testID="success-title">Request Submitted</Text>
      <Text style={s.subtitle}>
        Your visitor request has been submitted. Please wait for the host or security to approve it.
      </Text>

      <TouchableOpacity
        testID="success-check-status-btn"
        style={s.primaryBtn}
        onPress={() => router.replace({ pathname: '/status', params: mobile ? { mobile } : {} })}
      >
        <Text style={s.primaryBtnText}>Check Status</Text>
      </TouchableOpacity>

      <TouchableOpacity testID="success-home-btn" onPress={() => router.replace('/')}>
        <Text style={s.linkText}>Submit another request</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconWrap: { marginBottom: spacing.md },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  linkText: {
    color: colors.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
