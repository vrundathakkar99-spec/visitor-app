import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, categoryColors, categoryLabel, type VisitorCategory } from './theme';

export function CategoryBadge({ category, size = 'sm' }: { category: VisitorCategory; size?: 'sm' | 'md' }) {
  const c = categoryColors[category];
  const isMd = size === 'md';
  return (
    <View
      testID={`category-badge-${category}`}
      style={[
        s.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          paddingHorizontal: isMd ? 14 : 10,
          paddingVertical: isMd ? 6 : 4,
        },
      ]}
    >
      <View style={[s.dot, { backgroundColor: c.accent }]} />
      <Text style={[s.text, { color: c.text, fontSize: isMd ? 13 : 11 }]}>
        {categoryLabel(category)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontWeight: '600', letterSpacing: 0.2 },
});

// re-export colors for convenience
export { colors };
