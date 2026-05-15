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

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
// Prominent circular MW logo for the pass header
const PASS_LOGO = require('../../assets/images/maxwell-circle-logo.jpg');

export default function Pass() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getVisitor(id).then(setVisitor).catch((e) => setError(e?.message || 'Not found'));
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
    return <View style={s.center}><ActivityIndicator color={colors.textPrimary} /></View>;
  }

  const cat = categoryColors[visitor.category];
  const qrSrc = qrUrlFor(visitor.pass_number, 6);

  return (
    <ScrollView contentContainerStyle={s.container}>
      {/* VERTICAL HANGING BADGE */}
      <View style={s.lanyardWrap}>
        <View style={s.lanyardClip} />
        <View style={s.lanyardHole} />
      </View>

      <View style={s.pass} testID="visitor-pass-card">
        {/* Top color stripe */}
        <View style={[s.topStripe, { backgroundColor: cat.accent }]}>
          <Text style={s.topStripeText} numberOfLines={1}>
            {categoryLabel(visitor.category).toUpperCase()}
          </Text>
        </View>

        {/* Logo + brand block */}
        <View style={s.brandBlock}>
          <Image source={PASS_LOGO} style={s.brandLogo} resizeMode="contain" />
          <Text style={s.brandName}>MAXWELL</Text>
          <Text style={s.brandTagline}>VISITOR PASS</Text>
        </View>

        {/* Photo */}
        <View style={s.photoContainer}>
          <View style={[s.photoFrame, { borderColor: cat.accent }]}>
            {visitor.photo_base64 ? (
              <Image source={{ uri: visitor.photo_base64 }} style={s.photo} />
            ) : (
              <Ionicons name="person" size={58} color={colors.textTertiary} />
            )}
          </View>
        </View>

        {/* Name + pass # */}
        <Text style={s.name} testID="pass-name" numberOfLines={2}>{visitor.full_name}</Text>
        <View style={s.passNumberPill}>
          <Text style={s.passNumberText} testID="pass-number">{visitor.pass_number}</Text>
        </View>

        <View style={s.divider} />

        {/* Details */}
        <View style={s.details}>
          <DetailRow label="Category" value={categoryLabel(visitor.category)} accent={cat.accent} />
          {visitor.department ? (
            <DetailRow label="Department" value={visitor.department} />
          ) : null}
          <DetailRow label={visitor.category === 'management' ? 'Person' : 'To Meet'} value={visitor.assigned_to || visitor.person_to_meet || '—'} />
          <DetailRow label="Purpose" value={visitor.purpose} />
          <DetailRow label="Date & Time" value={new Date(visitor.created_at).toLocaleString()} />
          <DetailRow label="Mobile" value={visitor.mobile} />
        </View>

        <View style={s.divider} />

        {/* Status + QR */}
        <View style={s.bottomRow}>
          <View style={s.statusBlock}>
            <Text style={s.statusLabel}>STATUS</Text>
            <StatusBadge status={visitor.status} />
          </View>
          <View style={s.qrBlock}>
            <Image source={{ uri: qrSrc }} style={s.qr} resizeMode="contain" testID="visitor-pass-qr" />
            <Text style={s.qrCaption}>SCAN</Text>
          </View>
        </View>

        {/* Footer strip */}
        <View style={s.footer}>
          <Text style={s.footerText}>Maxwell Visitor Management</Text>
          <Text style={s.footerSubtext}>Please keep this pass visible during your visit</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.replace('/')} style={s.linkBtn}>
        <Text style={s.link}>Back to form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, accent && { color: accent, fontWeight: '700' }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: 60,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  // Lanyard hole top of card
  lanyardWrap: { alignItems: 'center', marginBottom: -6, zIndex: 2 },
  lanyardClip: {
    width: 60, height: 14,
    backgroundColor: '#94A3B8',
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  lanyardHole: {
    width: 28, height: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
    marginTop: -11,
    borderWidth: 1, borderColor: '#64748B',
  },
  pass: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: 0,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  topStripe: { paddingVertical: 6, alignItems: 'center' },
  topStripeText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  brandBlock: {
    alignItems: 'center',
    paddingTop: 16, paddingBottom: 4,
  },
  brandLogo: { width: 70, height: 70 },
  brandName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: 4, marginTop: 6 },
  brandTagline: { fontSize: 10, color: colors.textTertiary, letterSpacing: 2, fontWeight: '700', marginTop: 2 },
  photoContainer: { alignItems: 'center', marginTop: 10 },
  photoFrame: {
    width: 130, height: 150, borderRadius: 8, borderWidth: 3,
    backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  name: {
    fontSize: 20, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: -0.2, marginTop: 14, textAlign: 'center', paddingHorizontal: spacing.md,
  },
  passNumberPill: {
    alignSelf: 'center', marginTop: 6,
    backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3,
  },
  passNumberText: { fontFamily: monoFont, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12, marginHorizontal: spacing.md },
  details: { paddingHorizontal: spacing.md, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 },
  rowLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '500', flexShrink: 0 },
  rowValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  statusBlock: { gap: 4 },
  statusLabel: { fontSize: 10, color: colors.textTertiary, letterSpacing: 1.5, fontWeight: '700' },
  qrBlock: { alignItems: 'center', gap: 4 },
  qr: { width: 78, height: 78, backgroundColor: '#fff' },
  qrCaption: { fontSize: 9, color: colors.textTertiary, fontWeight: '700', letterSpacing: 1.5 },
  footer: {
    paddingVertical: 8, paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: { fontSize: 10, color: colors.textPrimary, fontWeight: '600', letterSpacing: 0.5 },
  footerSubtext: { fontSize: 9, color: colors.textTertiary, marginTop: 1 },
  error: { color: colors.rejectedText, fontSize: 15 },
  linkBtn: { marginTop: 16 },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
