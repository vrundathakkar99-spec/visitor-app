import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../src/theme';
import { getVisitor, type Visitor } from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';

export default function Pass() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getVisitor(id)
      .then(setVisitor)
      .catch((e) => setError(e?.message || 'Not found'));
  }, [id]);

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.error}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={s.linkBtn}>
          <Text style={s.link}>Go to form</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!visitor) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  const isApproved = visitor.status === 'approved';

  return (
    <View style={s.container}>
      <View style={s.pass} testID="visitor-pass-card">
        <View style={s.passHeader}>
          <Text style={s.passLabel}>VISITOR PASS</Text>
          <StatusBadge status={visitor.status} />
        </View>

        <View style={s.iconCircle}>
          {visitor.photo_base64 ? (
            <Image source={{ uri: visitor.photo_base64 }} style={s.photo} />
          ) : (
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'person'}
              size={48}
              color={isApproved ? colors.approvedText : colors.textTertiary}
            />
          )}
        </View>

        <Text style={s.name} testID="pass-name">{visitor.full_name}</Text>

        <View style={s.divider} />

        <PassRow label="Person to Meet" value={visitor.person_to_meet || '—'} />
        <PassRow label="Purpose" value={visitor.purpose} />
        <PassRow label="Date & Time" value={new Date(visitor.created_at).toLocaleString()} />
        <PassRow label="Mobile" value={visitor.mobile} />

        <View style={s.divider} />

        <View style={s.statusBlock}>
          <Text style={s.statusLabel}>Status</Text>
          <Text
            testID="pass-status-text"
            style={[
              s.statusValue,
              {
                color: isApproved
                  ? colors.approvedText
                  : visitor.status === 'rejected'
                  ? colors.rejectedText
                  : colors.pendingText,
              },
            ]}
          >
            {visitor.status.toUpperCase()}
          </Text>
        </View>

        {!isApproved && (
          <Text style={s.notice}>
            {visitor.status === 'pending'
              ? 'Your request is awaiting approval.'
              : 'Your request was rejected.'}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={() => router.replace('/')} style={s.linkBtn}>
        <Text style={s.link}>Back to form</Text>
      </TouchableOpacity>
    </View>
  );
}

function PassRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pass: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  passHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  passLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  photo: { width: '100%', height: '100%' },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBlock: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statusValue: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  notice: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  error: { color: colors.rejectedText, fontSize: 15 },
  linkBtn: { marginTop: 16 },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
