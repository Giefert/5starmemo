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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  BulletinPayload,
  CurationKind,
  RestaurantCurationItem,
} from '../types/shared';
import { StudyScreen } from './StudyScreen';
import { StudyCompletedScreen } from './StudyCompletedScreen';

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
  { kind: 'new_item', label: 'New items' },
  { kind: 'featured', label: 'Featured', tone: 'amber' },
  { kind: 'specials', label: 'Specials' },
  { kind: 'in_season', label: 'In season' },
];

type ScreenState = 'home' | 'study' | 'completed';

function isoWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export default function BulletinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [data, setData] = useState<BulletinPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [activeSection, setActiveSection] = useState<{ kind: CurationKind; label: string } | null>(null);
  const [studyStats, setStudyStats] = useState<{
    studied: number;
    correct: number;
    total: number;
  } | null>(null);

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

  // Hide tab bar during study sessions, like HomeScreen does.
  useEffect(() => {
    const shouldHideTabs = screenState === 'study' || screenState === 'completed';
    navigation.setOptions({
      tabBarStyle: shouldHideTabs
        ? { display: 'none' }
        : {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
    });
  }, [screenState, navigation, insets.bottom]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBulletin();
  };

  const handleSectionPress = (kind: CurationKind, label: string) => {
    const items = data?.curations[kind] ?? [];
    if (items.length === 0) return;
    Alert.alert(
      label,
      `Study the ${items.length} ${items.length === 1 ? 'item' : 'items'} in this section?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Study',
          onPress: () => {
            setActiveSection({ kind, label });
            setScreenState('study');
          },
        },
      ],
    );
  };

  const handleStudyComplete = (stats: { studied: number; correct: number; total: number }) => {
    setStudyStats(stats);
    setScreenState('completed');
  };

  const handleBackToHome = () => {
    setScreenState('home');
    setActiveSection(null);
    setStudyStats(null);
    loadBulletin();
  };

  if (screenState === 'study' && activeSection) {
    return (
      <StudyScreen
        target={{ kind: 'curation', curationKind: activeSection.kind, title: activeSection.label }}
        onComplete={handleStudyComplete}
        onExit={handleBackToHome}
      />
    );
  }

  if (screenState === 'completed' && studyStats) {
    return (
      <StudyCompletedScreen
        stats={studyStats}
        deckTitle={activeSection?.label}
        onContinue={handleBackToHome}
      />
    );
  }

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
    <View style={styles.container}>
      <View style={[styles.masthead, { paddingTop: insets.top + 36 }]}>
        <Text style={styles.eyebrow}>
          {restaurantName + ' · Week ' + week}
        </Text>
        <Text style={styles.headline}>Bulletin.</Text>
      </View>
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
        {announcements.length > 0 && (
          <View style={styles.announcementBlock}>
            {announcements.map((line, i) => (
              <Text key={i} style={styles.announcementLine}>
                {line}
              </Text>
            ))}
          </View>
        )}

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
              onPress={() => handleSectionPress(section.kind, section.label)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BulletinSection({
  label,
  tone,
  items,
  onPress,
}: {
  label: string;
  tone?: 'amber';
  items: RestaurantCurationItem[];
  onPress: () => void;
}) {
  const countColor = tone === 'amber' ? COLORS.amber : COLORS.paper;
  const disabled = items.length === 0;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={[styles.sectionCount, { color: countColor }]}>
          {items.length}
        </Text>
      </TouchableOpacity>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>Nothing here yet.</Text>
      ) : (
        <View style={styles.itemsList}>
          {items.map((item) => (
            <BulletinItemRow
              key={`${item.targetType}:${item.targetId}`}
              item={item}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function BulletinItemRow({ item }: { item: RestaurantCurationItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemTextWrap}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
      <Text style={styles.itemBadge}>
        {item.targetType === 'card'
          ? (item.category ?? 'card').toUpperCase()
          : 'DECK'}
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
    backgroundColor: COLORS.ink,
    paddingHorizontal: 24,
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
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.bgHair,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  announcementLine: {
    color: COLORS.onDark,
    fontSize: 20,
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
    color: COLORS.onDark,
    fontSize: 16,
    letterSpacing: 0.4,
    fontWeight: '600',
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
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.onDarkMute,
    fontSize: 15,
    marginBottom: 2,
  },
  itemBadge: {
    color: COLORS.onDarkMute,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
});
