import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from './theme';

const LOGO = require('../assets/images/maxwell-logo.png');

export function MaxwellLogo({ size = 36 }: { size?: number }) {
  return <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />;
}

export function MaxwellHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={s.headerRow}>
      <Image source={LOGO} style={s.logoImg} resizeMode="contain" />
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 16,
  },
  logoImg: { width: 160, height: 48 },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
