import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, categoryColors } from '../src/theme';
import { listVisitors, updateStatus, verifyPin, type Visitor } from '../src/api';
import { StatusBadge } from '../src/StatusBadge';
import { CategoryBadge } from '../src/CategoryBadge';

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const load = useCallback(
    async (p: string) => {
      setLoading(true);
      try {
        const data = await listVisitors(p);
        setItems(data);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (authed) load(pin);
  }, [authed, pin, load]);

  const handleDigit = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      const ok = await verifyPin(next);
      if (ok) {
        setAuthed(true);
      } else {
        Alert.alert('Wrong PIN', 'Please try again.');
        setPin('');
      }
    }
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const act = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const updated = await updateStatus(id, status, pin);
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
      // Refetch in background to stay in sync with backend (other admins, etc.)
      load(pin).catch(() => {});
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  if (!authed) {
    return (
      <View style={s.pinContainer}>
        <Ionicons name="shield-checkmark-outline" size={48} color={colors.textPrimary} />
        <Text style={s.pinTitle} testID="admin-pin-title">Admin PIN</Text>
        <Text style={s.pinSub}>Enter your 4-digit access code</Text>

        <View style={s.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              testID={`pin-dot-${i}`}
              style={[s.dot, i < pin.length && s.dotFilled]}
            />
          ))}
        </View>

        <View style={s.keypad}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <TouchableOpacity
              key={d}
              testID={`pin-key-${d}`}
              style={s.key}
              onPress={() => handleDigit(d)}
              activeOpacity={0.6}
            >
              <Text style={s.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.key} />
          <TouchableOpacity
            testID="pin-key-0"
            style={s.key}
            onPress={() => handleDigit('0')}
            activeOpacity={0.6}
          >
            <Text style={s.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="pin-key-back"
            style={s.key}
            onPress={handleBackspace}
            activeOpacity={0.6}
          >
            <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 24 }}>
          <Text style={s.link}>Back to form</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visible = items.filter((v) => filter === 'all' || v.status === filter);

  return (
    <View style={s.flex}>
      <View style={s.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            testID={`filter-${f}-btn`}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && items.length === 0 ? (
        <View style={{ marginTop: 40 }}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(pin);
              }}
            />
          }
          testID="admin-list"
        >
          {visible.length === 0 && (
            <View style={s.emptyWrap}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.textTertiary} />
              <Text style={s.empty}>No visitor requests in this view.</Text>
            </View>
          )}
          {visible.map((v) => {
            const cat = categoryColors[v.category];
            return (
            <View
              key={v.id}
              style={[s.card, { borderLeftWidth: 4, borderLeftColor: cat.accent }]}
              testID={`admin-card-${v.id}`}
            >
              <View style={s.cardTop}>
                {v.photo_base64 ? (
                  <Image source={{ uri: v.photo_base64 }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback]}>
                    <Ionicons name="person" size={22} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{v.full_name}</Text>
                  <Text style={s.meta}>{v.mobile}</Text>
                </View>
                <StatusBadge status={v.status} />
              </View>

              <View style={s.badgeRow}>
                <CategoryBadge category={v.category} />
                <Text style={s.passNumber}>{v.pass_number}</Text>
              </View>

              <Row label="Person to Meet" value={v.person_to_meet || '—'} />
              <Row label="Purpose" value={v.purpose} />
              <Row label="Time" value={formatDate(v.created_at)} />

              {v.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    testID={`reject-visitor-btn-${v.id}`}
                    style={[s.actionBtn, s.rejectBtn]}
                    onPress={() => act(v.id, 'rejected')}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.rejectedText} />
                    <Text style={[s.actionText, { color: colors.rejectedText }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`approve-visitor-btn-${v.id}`}
                    style={[s.actionBtn, s.approveBtn]}
                    onPress={() => act(v.id, 'approved')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={[s.actionText, { color: '#fff' }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}

              {v.status === 'approved' && (
                <TouchableOpacity
                  testID={`admin-view-pass-${v.id}`}
                  style={s.passLinkBtn}
                  onPress={() => router.push(`/pass/${v.id}`)}
                >
                  <Text style={s.passLinkText}>View Pass</Text>
                </TouchableOpacity>
              )}
            </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  pinContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  pinSub: { color: colors.textSecondary, marginTop: 4, marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 28 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotFilled: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  keypad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyText: { fontSize: 24, color: colors.textPrimary, fontWeight: '500' },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  filterText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: colors.primaryText },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 4,
  },
  passNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  rejectBtn: { backgroundColor: colors.rejectedBg, borderColor: colors.rejectedBorder },
  approveBtn: { backgroundColor: colors.approvedText, borderColor: colors.approvedText },
  actionText: { fontWeight: '600', fontSize: 14 },
  passLinkBtn: {
    marginTop: 8,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.approvedBg,
    borderWidth: 1,
    borderColor: colors.approvedBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passLinkText: { color: colors.approvedText, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  empty: { color: colors.textSecondary },
});
