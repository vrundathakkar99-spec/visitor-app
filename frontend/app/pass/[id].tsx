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
import { getVisitor, type Visitor } from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';
import { CategoryBadge } from '../../src/CategoryBadge';
import { MaxwellLogo } from '../../src/MaxwellLogo';

// Simple fake barcode using stripes (no extra deps)
function Barcode({ value }: { value: string }) {
  // Deterministic stripe widths from the value's char codes
  const stripes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    stripes.push(1 + (c % 3)); // width 1..3
    stripes.push(1 + ((c >> 2) % 2)); // gap width 1..2
  }
  return (
    <View style={s.barcodeWrap} testID="visitor-barcode">
      <View style={s.barcodeBars}>
        {stripes.map((w, i) => (
          <View
            key={i}
            style={{
              width: w * 2,
              height: 44,
              backgroundColor: i % 2 === 0 ? '#0F172A' : 'transparent',
            }}
          />
        ))}
      </View>
      <Text style={s.barcodeText}>{value}</Text>
    </View>
  );
}

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
  const isApproved = visitor.status === 'approved';

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.pass} testID="visitor-pass-card">
        {/* HEADER STRIP */}
        <View style={[s.passHeaderStrip, { backgroundColor: colors.primaryBg }]}>
          <View style={s.brandRow}>
            <MaxwellLogo size={36} />
            <View>
              <Text style={s.brandName}>MAXWELL</Text>
              <Text style={s.brandTagline}>VISITOR PASS</Text>
            </View>
          </View>
          <View style={[s.categoryStripe, { backgroundColor: cat.accent }]}>
            <Text style={s.categoryStripeText}>{categoryLabel(visitor.category).toUpperCase()}</Text>
          </View>
        </View>

        {/* BODY */}
        <View style={s.passBody}>
          <View style={s.photoFrame}>
            {visitor.photo_base64 ? (
              <Image source={{ uri: visitor.photo_base64 }} style={s.photo} />
            ) : (
              <Ionicons name="person" size={56} color={colors.textTertiary} />
            )}
          </View>

          <Text style={s.name} testID="pass-name">{visitor.full_name}</Text>

          <View style={s.passNumberPill}>
            <Text style={s.passNumberPillText} testID="pass-number">
              {visitor.pass_number}
            </Text>
          </View>

          <View style={s.divider} />

          <PassRow label="Category" value={categoryLabel(visitor.category)} accent={cat.accent} />
          <PassRow label="Purpose" value={visitor.purpose} />
          <PassRow label="Person to Meet" value={visitor.person_to_meet || '—'} />
          <PassRow label="Date & Time" value={new Date(visitor.created_at).toLocaleString()} />
          <PassRow label="Mobile" value={visitor.mobile} />

          <View style={s.divider} />

          <View style={s.statusBlock}>
            <Text style={s.statusLabel}>STATUS</Text>
            <StatusBadge status={visitor.status} />
          </View>

          {!isApproved && (
            <Text style={s.notice}>
              {visitor.status === 'pending'
                ? 'Your request is awaiting approval.'
                : 'Your request was rejected.'}
            </Text>
          )}

          <Barcode value={visitor.pass_number} />
        </View>

        {/* FOOTER STRIP */}
        <View style={s.passFooter}>
          <Text style={s.footerText}>Maxwell Visitor Management System</Text>
          <Text style={s.footerSubtext}>Please keep this pass visible during your visit</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.replace('/')} style={s.linkBtn}>
        <Text style={s.link}>Back to form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PassRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, accent && { color: accent, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: 60,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pass: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  passHeaderStrip: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 2,
    fontWeight: '600',
  },
  categoryStripe: {
    marginHorizontal: -spacing.md,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryStripeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 3,
  },
  passBody: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  photoFrame: {
    width: 110,
    height: 110,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.primaryBg,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  photo: { width: '100%', height: '100%' },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  passNumberPill: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  passNumberPillText: {
    fontFamily: monoFont,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
    fontWeight: '600',
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
    paddingVertical: 5,
  },
  rowLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBlock: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  notice: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  barcodeWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  barcodeText: {
    fontFamily: monoFont,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  passFooter: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerSubtext: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  error: { color: colors.rejectedText, fontSize: 15 },
  linkBtn: { marginTop: 16 },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
