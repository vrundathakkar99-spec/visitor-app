import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

export function MaxwellLogo({ size = 36 }: { size?: number }) {
  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Text style={[s.letter, { fontSize: size * 0.55 }]}>M</Text>
    </View>
  );
}

export function MaxwellHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={s.headerRow}>
      <MaxwellLogo size={42} />
      <View style={{ flex: 1 }}>
        <Text style={s.brand}>MAXWELL</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
