import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../src/theme';
import { qrEntryUrl, publicEntryUrl } from '../src/api';
import { MaxwellLogo } from '../src/MaxwellLogo';

export default function EntryQrScreen() {
  const router = useRouter();
  const qr = qrEntryUrl(10);
  const url = publicEntryUrl();

  const onShare = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(url);
      } else {
        await Share.share({ message: url });
      }
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.brandRow}>
        <MaxwellLogo size={56} />
      </View>
      <Text style={s.title} testID="entry-qr-title">Visitor Entry QR</Text>
      <Text style={s.subtitle}>
        Display or print this QR at the gate. Visitors scan it with any mobile camera to open the
        entry form in their browser — no app install required.
      </Text>

      <View style={s.qrCard}>
        <Image source={{ uri: qr }} style={s.qrImg} resizeMode="contain" testID="entry-qr-image" />
        <Text style={s.urlText} numberOfLines={2} testID="entry-qr-url">{url}</Text>
      </View>

      <TouchableOpacity onPress={onShare} style={s.shareBtn} testID="share-entry-url">
        <Ionicons
          name={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'}
          size={18}
          color="#fff"
        />
        <Text style={s.shareText}>
          {Platform.OS === 'web' ? 'Copy URL' : 'Share URL'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.link}>Back to admin</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    alignItems: 'center',
    paddingBottom: 60,
  },
  brandRow: { marginBottom: spacing.md },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 360,
    marginBottom: spacing.lg,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  qrImg: { width: 260, height: 260, backgroundColor: '#fff' },
  urlText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  shareBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: radius.md,
  },
  shareText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  backBtn: { marginTop: spacing.md },
  link: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
