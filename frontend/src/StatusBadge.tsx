import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';
import type { VisitorStatus } from './api';

export function StatusBadge({ status }: { status: VisitorStatus }) {
  const styleMap = {
    pending: { bg: colors.pendingBg, text: colors.pendingText, border: colors.pendingBorder, label: 'Pending' },
    approved: { bg: colors.approvedBg, text: colors.approvedText, border: colors.approvedBorder, label: 'Approved' },
    rejected: { bg: colors.rejectedBg, text: colors.rejectedText, border: colors.rejectedBorder, label: 'Rejected' },
  }[status];
  return (
    <View
      testID={`status-badge-${status}`}
      style={[s.badge, { backgroundColor: styleMap.bg, borderColor: styleMap.border }]}
    >
      <Text style={[s.text, { color: styleMap.text }]}>{styleMap.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
});
