import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  BulletinPayload,
  CurationKind,
  RestaurantCurationItem,
} from '../types/shared';

const COLORS = {
  ink: '#14120F',
  inkSoft: '#1C1A16',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

const SECTIONS: { kind: CurationKind; label: string; tone?: 'amber' }[] = [
  { kind: 'specials', label: 'Specials' },
  { kind: 'new_item', label: 'New items' },
  { kind: 'featured', label: 'Featured', tone: 'amber' },
  { kind: 'in_season', label: 'In season' },
];

function isoWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export default function BulletinScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [data, setData] = useState<BulletinPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBulletin = useCallback(async () => {
    try {
      const payload = await apiService.getBulletin();
      setData(payload);
      setError('');
    } catch (err: any) {
      if (err?.name === 'AuthenticationError') {
        logout();
        return;
      }
      setError(err?.message || 'Failed to load bulletin');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    loadBulletin();
  }, [loadBulletin]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBulletin();
  };

  const handleRecommendedStudy = () => {
    Alert.alert('Coming soon', 'Recommended Study is not available yet.');
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.amber} />
        <Text style={styles.loadingText}>Loading the bulletin…</Text>
      </View>
    );
  }

  const week = isoWeekNumber();
  const restaurantName = (data?.restaurant.name ?? '').toUpperCase();
  const announcements = data?.restaurant.announcements ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.amber}
          />
        }
      >
        <View style={styles.masthead}>
          <Text style={styles.eyebrow}>
            {restaurantName + ' · Week ' + week}
          </Text>
          <Text style={styles.headline}>Bulletin.</Text>

          {announcements.length > 0 && (
            <View style={styles.announcementBlock}>
              {announcements.map((line, i) => (
                <Text key={i} style={styles.announcementLine}>
                  {line}
                </Text>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sections}>
          {SECTIONS.map((section) => (
            <BulletinSection
              key={section.kind}
              label={section.label}
              tone={section.tone}
              items={data?.curations[section.kind] ?? []}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.recommendedButton}
          onPress={handleRecommendedStudy}
          activeOpacity={0.85}
        >
          <Text style={styles.recommendedButtonText}>Recommended Study</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function BulletinSection({
  label,
  tone,
  items,
}: {
  label: string;
  tone?: 'amber';
  items: RestaurantCurationItem[];
}) {
  const countColor = tone === 'amber' ? COLORS.amber : COLORS.paper;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={[styles.sectionCount, { color: countColor }]}>
          {items.length}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>Nothing here yet.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {items.map((item) => (
            <BulletinCard
              key={`${item.targetType}:${item.targetId}`}
              item={item}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function BulletinCard({ item }: { item: RestaurantCurationItem }) {
  const subtitle =
    item.targetType === 'card'
      ? item.deckTitle || (item.category ? item.category.toUpperCase() : 'CARD')
      : 'DECK';

  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cardImagePlaceholderText}>
              {item.targetType === 'deck' ? 'DECK' : 'CARD'}
            </Text>
          </View>
        )}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>
            {item.targetType === 'card' ? 'CARD' : 'DECK'}
          </Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.onDarkMute,
    fontSize: 14,
    fontStyle: 'italic',
  },
  masthead: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
  },
  eyebrow: {
    color: COLORS.amber,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  headline: {
    color: COLORS.paper,
    fontSize: 56,
    lineHeight: 56,
    fontFamily: 'Georgia',
    letterSpacing: -1.5,
  },
  announcementBlock: {
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.bgHair,
    paddingTop: 14,
    gap: 6,
  },
  announcementLine: {
    color: COLORS.onDark,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: COLORS.paper,
    fontSize: 13,
  },
  sections: {
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.bgHair,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.bgHair,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    color: COLORS.onDarkMute,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  sectionCount: {
    fontFamily: 'Georgia',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  emptyText: {
    color: COLORS.onDarkMute,
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 8,
  },
  cardsRow: {
    gap: 12,
    paddingRight: 24,
  },
  card: {
    width: 160,
  },
  cardImageWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  cardImage: {
    width: 160,
    height: 160,
    borderRadius: 2,
    backgroundColor: COLORS.inkSoft,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.bgHair,
  },
  cardImagePlaceholderText: {
    color: COLORS.onDarkMute,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(20, 18, 15, 0.8)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.bgHair,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  cardBadgeText: {
    color: COLORS.onDarkMute,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: COLORS.onDark,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: COLORS.onDarkMute,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recommendedButton: {
    marginTop: 28,
    marginHorizontal: 24,
    backgroundColor: COLORS.amber,
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
  },
  recommendedButtonText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
