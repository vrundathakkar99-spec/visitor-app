import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, categoryColors, categoryLabel } from '../../src/theme';
import { getVisitor, qrUrlFor, type Visitor } from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';
import { MaxwellLogo } from '../../src/MaxwellLogo';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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

  const cat = categoryColors[visitor.category];
  const qrSrc = qrUrlFor(visitor.pass_number, 6);

  return (
    <ScrollView contentContainerStyle={s.container}>
      {/* HORIZONTAL BADGE — landscape, suitable for clip-on holders */}
      <View style={s.pass} testID="visitor-pass-card">
        {/* Top color strip */}
        <View style={[s.colorStrip, { backgroundColor: cat.accent }]}>
          <Text style={s.colorStripText} numberOfLines={1}>
            {categoryLabel(visitor.category).toUpperCase()}
            {visitor.sub_category ? `  •  ${visitor.sub_category}` : ''}
          </Text>
        </View>

        {/* Header (brand + pass#) */}
        <View style={s.header}>
          <MaxwellLogo size={36} />
          <View style={s.headerRight}>
            <Text style={s.passLabel}>VISITOR PASS</Text>
            <Text style={s.passNum} testID="pass-number">{visitor.pass_number}</Text>
          </View>
        </View>

        {/* Body: photo | details | QR */}
        <View style={s.body}>
          <View style={[s.photoFrame, { borderColor: cat.accent }]}>
            {visitor.photo_base64 ? (
              <Image source={{ uri: visitor.photo_base64 }} style={s.photo} />
            ) : (
              <Ionicons name="person" size={42} color={colors.textTertiary} />
            )}
          </View>

          <View style={s.details}>
            <Text style={s.name} numberOfLines={2} testID="pass-name">{visitor.full_name}</Text>
            <Row label="Purpose" value={visitor.purpose} />
            <Row label="To Meet" value={visitor.person_to_meet || '—'} />
            <Row label="Date/Time" value={new Date(visitor.created_at).toLocaleString()} />
            <View style={s.statusInline}>
              <Text style={s.statusLabel}>STATUS</Text>
              <StatusBadge status={visitor.status} />
            </View>
          </View>

          <View style={s.qrCol}>
            <Image
              source={{ uri: qrSrc }}
              style={s.qrImg}
              resizeMode="contain"
              testID="visitor-pass-qr"
            />
            <Text style={s.qrCaption}>SCAN</Text>
          </View>
        </View>

        {/* Footer strip */}
        <View style={s.footer}>
          <Text style={s.footerText}>Maxwell Visitor Management</Text>
          <Text style={s.footerSubtext}>Please keep this pass visible</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.replace('/')} style={s.linkBtn}>
        <Text style={s.link}>Back to form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    alignItems: 'center',
    paddingBottom: 50,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pass: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  colorStrip: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  colorStripText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerRight: { alignItems: 'flex-end' },
  passLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  passNum: {
    fontFamily: monoFont,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    fontWeight: '600',
    marginTop: 1,
  },
  body: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
    alignItems: 'flex-start',
  },
  photoFrame: {
    width: 84,
    height: 100,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '500', minWidth: 56 },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  qrCol: {
    alignItems: 'center',
    gap: 4,
  },
  qrImg: {
    width: 84,
    height: 84,
    backgroundColor: '#fff',
  },
  qrCaption: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerSubtext: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
  error: { color: colors.rejectedText, fontSize: 15 },
  linkBtn: { marginTop: 16 },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
