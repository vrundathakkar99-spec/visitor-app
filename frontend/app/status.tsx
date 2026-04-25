import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, spacing } from '../src/theme';
import { listByMobile, type Visitor } from '../src/api';
import { StatusBadge } from '../src/StatusBadge';

export default function StatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mobile?: string }>();
  const [mobile, setMobile] = useState(params.mobile ?? '');
  const [items, setItems] = useState<Visitor[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (m: string) => {
    if (!/^[0-9]{6,15}$/.test(m)) {
      Alert.alert('Invalid mobile', 'Enter a valid mobile number.');
      return;
    }
    setLoading(true);
    try {
      const data = await listByMobile(m);
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params.mobile) fetchData(params.mobile);
  }, [params.mobile, fetchData]);

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <TextInput
          testID="status-mobile-input"
          value={mobile}
          onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, ''))}
          placeholder="Enter mobile number"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          style={s.input}
          maxLength={15}
        />
        <TouchableOpacity
          testID="status-search-btn"
          style={s.searchBtn}
          onPress={() => fetchData(mobile)}
        >
          <Text style={s.searchBtnText}>Check</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ marginTop: 24 }}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} testID="status-results">
        {items && items.length === 0 && (
          <Text style={s.empty} testID="status-empty">
            No requests found for this mobile number.
          </Text>
        )}
        {items?.map((v) => (
          <View key={v.id} style={s.card} testID={`status-card-${v.id}`}>
            <View style={s.cardHead}>
              <Text style={s.name}>{v.full_name}</Text>
              <StatusBadge status={v.status} />
            </View>
            <Row label="Person to Meet" value={v.person_to_meet || '—'} />
            <Row label="Purpose" value={v.purpose} />
            <Row label="Submitted" value={formatDate(v.created_at)} />

            {v.status === 'approved' && (
              <TouchableOpacity
                testID={`view-pass-btn-${v.id}`}
                style={s.passBtn}
                onPress={() => router.push(`/pass/${v.id}`)}
              >
                <Text style={s.passBtnText}>View Visitor Pass</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  searchBtn: {
    height: 52,
    paddingHorizontal: 22,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: colors.primaryText, fontWeight: '600' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  passBtn: {
    marginTop: 8,
    height: 44,
    backgroundColor: colors.approvedBg,
    borderColor: colors.approvedBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBtnText: { color: colors.approvedText, fontWeight: '600' },
});
