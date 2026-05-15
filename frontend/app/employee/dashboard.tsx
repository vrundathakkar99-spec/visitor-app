import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { colors, radius, spacing, categoryColors, categoryLabel } from '../../src/theme';
import {
  employeeVisitors,
  updateStatusEmployee,
  loadSession,
  clearSession,
  type Visitor,
  type EmployeeProfile,
} from '../../src/api';
import { StatusBadge } from '../../src/StatusBadge';

const REFRESH_MS = 15000;

export default function EmployeeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [items, setItems] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const data = await employeeVisitors();
      setItems(data);
    } catch (e: any) {
      // token expired or invalid → log out
      Alert.alert('Session expired', 'Please log in again.');
      await clearSession();
      router.replace('/employee/login');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (!session) {
        router.replace('/employee/login');
        return;
      }
      setProfile(session.profile);
      await load();
    })();
  }, [load, router]);

  useEffect(() => {
    timer.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const logout = async () => {
    await clearSession();
    router.replace('/');
  };

  const act = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const updated = await updateStatusEmployee(id, status);
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (e: any) {
      Alert.alert('Action failed', e?.message?.includes('409') || e?.message?.includes('Already') ? 'This request was already decided by someone else.' : (e?.message || 'Failed'));
      // refresh to reflect server state
      load();
    }
  };

  const visible = items.filter((v) => filter === 'all' || v.status === filter);
  const pendingCount = items.filter((v) => v.status === 'pending').length;

  if (loading && !profile) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <View style={s.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.welcomeLabel}>Signed in</Text>
          <Text style={s.welcomeName}>{profile?.name}</Text>
          <Text style={s.welcomeDept}>{profile?.department} • {profile?.email}</Text>
        </View>
        <TouchableOpacity testID="employee-logout-btn" style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        <Stat label="Pending" value={pendingCount} tint={colors.pendingText} />
        <Stat label="Total today" value={items.length} tint={colors.textPrimary} />
      </View>

      <View style={s.filterRow}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            testID={`emp-filter-${f}`}
            onPress={() => setFilter(f)}
            style={[s.filterChip, filter === f && s.filterChipActive]}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        testID="employee-list"
      >
        {visible.length === 0 && (
          <View style={s.emptyWrap}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={s.empty}>No {filter === 'all' ? '' : filter} requests for {profile?.department}.</Text>
          </View>
        )}
        {visible.map((v) => {
          const cat = categoryColors[v.category];
          return (
            <View key={v.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: cat.accent }]} testID={`emp-card-${v.id}`}>
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

              <View style={s.metaRow}>
                <Text style={[s.metaPill, { backgroundColor: cat.bg, color: cat.text, borderColor: cat.border }]}>
                  {categoryLabel(v.category)}
                </Text>
                <Text style={s.passNumber}>{v.pass_number}</Text>
              </View>

              <Row label="To Meet" value={v.assigned_to || v.person_to_meet || '—'} />
              <Row label="Purpose" value={v.purpose} />
              <Row label="Time" value={formatDate(v.created_at)} />
              {v.status !== 'pending' && v.decided_by ? (
                <Row label="Decided By" value={v.decided_by} />
              ) : null}

              {v.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    testID={`emp-reject-${v.id}`}
                    style={[s.actionBtn, s.rejectBtn]}
                    onPress={() => act(v.id, 'rejected')}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.rejectedText} />
                    <Text style={[s.actionText, { color: colors.rejectedText }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`emp-approve-${v.id}`}
                    style={[s.actionBtn, s.approveBtn]}
                    onPress={() => act(v.id, 'approved')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={[s.actionText, { color: '#fff' }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
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

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color: tint }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  welcomeLabel: { fontSize: 11, color: colors.textTertiary, letterSpacing: 1, fontWeight: '600' },
  welcomeName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  welcomeDept: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  logoutText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, padding: spacing.md },
  statBox: {
    flex: 1, padding: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, fontWeight: '500', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingBottom: 4, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  filterText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: colors.primaryText },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md, gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  metaPill: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
    overflow: 'hidden',
  },
  passNumber: {
    fontSize: 11, color: colors.textTertiary, letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1,
  },
  rejectBtn: { backgroundColor: colors.rejectedBg, borderColor: colors.rejectedBorder },
  approveBtn: { backgroundColor: colors.approvedText, borderColor: colors.approvedText },
  actionText: { fontWeight: '600', fontSize: 14 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  empty: { color: colors.textSecondary },
});
