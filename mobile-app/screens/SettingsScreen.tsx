import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCalendars } from 'expo-localization';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { useDecks } from '../contexts/DecksContext';
import { AppDialog, type DialogOptions } from '../components/AppDialog';
import apiService from '../services/api';
import {
  DailyReminderSettings,
  DEFAULT_DAILY_REMINDER_TIME,
  deleteDailyReminderSettings,
  formatDailyReminderTime,
  initializeDailyReminderSettings,
  saveDailyReminderSettings,
} from '../services/reminders';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

// Carte tokens — shared verbatim with HomeScreen / BulletinScreen / LibraryScreen
// so the Settings tab reads as a sibling of Study, Bulletin and Library.
const COLORS = {
  ink: '#14120F',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  paperSoft: '#FBF7EC',
  paperHair: '#D8CFB8',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  onDark: '#E8E3D6',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_PICKER_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;
const WHEEL_VERTICAL_PADDING = WHEEL_ITEM_HEIGHT * ((WHEEL_VISIBLE_ITEMS - 1) / 2);

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));
const HOUR_24_OPTIONS = Array.from({ length: 24 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));
const PERIOD_OPTIONS = [
  { label: 'AM', value: 'AM' },
  { label: 'PM', value: 'PM' },
] as const;

type ReminderPeriod = 'AM' | 'PM';

// Right-pointing navigation chevron — same glyph as the Bulletin item rows.
function Chevron() {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path
        d="M1 1l5 6-5 6"
        fill="none"
        stroke={COLORS.inkFaint}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Left-pointing back chevron — matches the back buttons on the other tabs.
function BackChevron() {
  return (
    <Svg width={9} height={14} viewBox="0 0 9 14">
      <Path
        d="M7 1L2 7l5 6"
        fill="none"
        stroke={COLORS.onDarkMute}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// A ruled editorial row: Fraunces label on paper with a trailing chevron, or a
// spinner while its action is in flight. Rows stack inside a `group` whose
// hairlines fence them off.
function NavRow({
  label,
  detail,
  onPress,
  busy,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.inkFaint} />
      ) : (
        <Chevron />
      )}
    </Pressable>
  );
}

type WheelOption<T extends string | number> = {
  label: string;
  value: T;
};

function toWheelTime(hour: number, minute: number): {
  hour12: number;
  minute: number;
  period: ReminderPeriod;
} {
  return {
    hour12: hour % 12 || 12,
    minute,
    period: hour >= 12 ? 'PM' : 'AM',
  };
}

function toTwentyFourHour(hour12: number, period: ReminderPeriod): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function getFallbackUses24HourClock(): boolean {
  try {
    const hourCycle = Intl.DateTimeFormat().resolvedOptions().hourCycle;
    return hourCycle === 'h23' || hourCycle === 'h24';
  } catch {
    return false;
  }
}

function WheelPicker<T extends string | number>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: readonly WheelOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    });
  }, [selectedIndex]);

  const selectIndex = (index: number, animated = true) => {
    const bounded = Math.max(0, Math.min(index, options.length - 1));
    scrollRef.current?.scrollTo({
      y: bounded * WHEEL_ITEM_HEIGHT,
      animated,
    });
    onChange(options[bounded].value);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (disabled) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    selectIndex(index, true);
  };

  const handleDragEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocityY) < 0.01) {
      handleScrollEnd(event);
    }
  };

  return (
    <View style={styles.wheelPicker}>
      <View pointerEvents="none" style={styles.wheelSelectionBand} />
      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled
        scrollEnabled={!disabled}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleDragEnd}
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              key={`${option.value}`}
              style={styles.wheelItem}
              disabled={disabled}
              onPress={() => selectIndex(index)}
            >
              <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ReminderTimeWheel({
  time,
  uses24HourClock,
  disabled,
  onChange,
}: {
  time: { hour: number; minute: number };
  uses24HourClock: boolean;
  disabled?: boolean;
  onChange: (time: { hour: number; minute: number }) => void;
}) {
  const wheelTime = toWheelTime(time.hour, time.minute);

  const updateTime = (next: Partial<typeof wheelTime>) => {
    const merged = { ...wheelTime, ...next };
    onChange({
      hour: toTwentyFourHour(merged.hour12, merged.period),
      minute: merged.minute,
    });
  };

  if (uses24HourClock) {
    return (
      <View style={[styles.timeWheel, disabled && styles.timeWheelDisabled]}>
        <WheelPicker
          options={HOUR_24_OPTIONS}
          value={time.hour}
          disabled={disabled}
          onChange={(hour) => onChange({ hour, minute: time.minute })}
        />
        <WheelPicker
          options={MINUTE_OPTIONS}
          value={time.minute}
          disabled={disabled}
          onChange={(minute) => onChange({ hour: time.hour, minute })}
        />
      </View>
    );
  }

  return (
    <View style={[styles.timeWheel, disabled && styles.timeWheelDisabled]}>
      <WheelPicker
        options={HOUR_OPTIONS}
        value={wheelTime.hour12}
        disabled={disabled}
        onChange={(hour12) => updateTime({ hour12 })}
      />
      <WheelPicker
        options={MINUTE_OPTIONS}
        value={wheelTime.minute}
        disabled={disabled}
        onChange={(minute) => updateTime({ minute })}
      />
      <WheelPicker
        options={PERIOD_OPTIONS}
        value={wheelTime.period}
        disabled={disabled}
        onChange={(period) => updateTime({ period })}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const calendars = useCalendars();
  const deviceUses24HourClock =
    calendars[0]?.uses24hourClock ?? getFallbackUses24HourClock();
  const { logout, restaurant, user } = useAuth();
  const { decks, loadDecks, invalidateDecks } = useDecks();
  const [isExporting, setIsExporting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<DailyReminderSettings | null>(null);
  const [isLoadingReminder, setIsLoadingReminder] = useState(true);
  const [isReminderUnavailable, setIsReminderUnavailable] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [reminderDraftEnabled, setReminderDraftEnabled] = useState(false);
  const [reminderDraftTime, setReminderDraftTime] = useState(DEFAULT_DAILY_REMINDER_TIME);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [notice, setNotice] = useState<DialogOptions | null>(null);
  const resetLoadRequest = useRef(0);

  const dismissNotice = () => setNotice(null);

  const showNotice = (title: string, message: string) => {
    setNotice({
      title,
      message,
      primaryAction: { label: 'OK', onPress: dismissNotice },
    });
  };

  // The masthead is dark behind the status bar — keep its text light, matching
  // the other tabs.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    const loadReminder = async () => {
      if (!user?.id || !restaurant?.id) {
        setReminderSettings(null);
        setIsLoadingReminder(false);
        return;
      }

      setIsLoadingReminder(true);
      setIsReminderUnavailable(false);
      try {
        const settings = await initializeDailyReminderSettings(user.id, restaurant.id);
        if (isMounted) setReminderSettings(settings);
      } catch (error) {
        console.warn('Failed to load daily reminder:', error);
        if (isMounted) {
          setReminderSettings(null);
          setIsReminderUnavailable(true);
        }
      } finally {
        if (isMounted) setIsLoadingReminder(false);
      }
    };

    void loadReminder();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadReminder();
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [user?.id, restaurant?.id]);

  const openReminderModal = () => {
    const settings = reminderSettings ?? {
      enabled: false,
      ...DEFAULT_DAILY_REMINDER_TIME,
    };
    setReminderDraftEnabled(settings.enabled);
    setReminderDraftTime({ hour: settings.hour, minute: settings.minute });
    setShowReminderModal(true);
  };

  const handleSaveReminder = async () => {
    if (!user?.id || !restaurant?.id) return;

    setIsSavingReminder(true);
    try {
      const result = await saveDailyReminderSettings(user.id, restaurant.id, {
        enabled: reminderDraftEnabled,
        hour: reminderDraftTime.hour,
        minute: reminderDraftTime.minute,
      });
      setReminderSettings(result.settings);
      setIsReminderUnavailable(false);

      if (!result.permissionGranted) {
        setReminderDraftEnabled(false);
        setShowReminderModal(false);
        showNotice(
          'Notifications are off',
          'Allow notifications for Tusavor in your device settings to use a daily reminder.',
        );
        return;
      }

      setShowReminderModal(false);
    } catch {
      setReminderSettings(null);
      setIsReminderUnavailable(true);
      showNotice('Couldn’t save the reminder', 'Please try again.');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await apiService.exportData();
      await Share.share({
        message: data,
        title: 'My Tusavor Data',
      });
    } catch {
      showNotice('Couldn’t export your data', 'Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await apiService.deleteAccount();
      if (user?.id && restaurant?.id) {
        try {
          await deleteDailyReminderSettings(user.id, restaurant.id);
        } catch (error) {
          console.warn('Failed to clear deleted account reminder:', error);
        }
      }
      await logout();
    } catch {
      showNotice('Couldn’t delete your account', 'Please try again.');
      setIsDeleting(false);
    }
  };

  const openResetModal = async () => {
    const request = ++resetLoadRequest.current;
    setShowResetModal(true);
    setSelectedDeckIds(new Set());
    const needsInitialLoad = decks.length === 0;
    setIsLoadingDecks(needsInitialLoad);
    try {
      await loadDecks();
    } catch {
      if (request === resetLoadRequest.current) {
        showNotice('Couldn’t load your decks', 'Please try again.');
        setShowResetModal(false);
      }
    } finally {
      if (request === resetLoadRequest.current) setIsLoadingDecks(false);
    }
  };

  const toggleDeck = (deckId: string) => {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev);
      if (next.has(deckId)) {
        next.delete(deckId);
      } else {
        next.add(deckId);
      }
      return next;
    });
  };

  const allSelected = decks.length > 0 && selectedDeckIds.size === decks.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDeckIds(new Set());
    } else {
      setSelectedDeckIds(new Set(decks.map((d) => d.id)));
    }
  };

  const performReset = async (deckIds: string[] | undefined, label: string) => {
    setIsResetting(true);
    try {
      await apiService.resetFsrs(deckIds);
      invalidateDecks();
      void loadDecks(true).catch(() => {
        // The next consumer can retry; the reset itself already succeeded.
      });
      setShowResetModal(false);
      showNotice('Progress reset', `${label} reset successfully.`);
    } catch {
      showNotice('Couldn’t reset progress', 'Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetConfirm = () => {
    if (selectedDeckIds.size === 0) {
      showNotice('Select a deck', 'Choose at least one deck to reset.');
      return;
    }
    const resettingAll = selectedDeckIds.size === decks.length;
    const deckIds = resettingAll ? undefined : Array.from(selectedDeckIds);
    setNotice({
      title: resettingAll
        ? 'Reset all study progress?'
        : `Reset ${selectedDeckIds.size} deck${selectedDeckIds.size === 1 ? '' : 's'}?`,
      message: resettingAll
        ? 'All cards go back to unseen. This can’t be undone.'
        : 'Shared cards reset in every deck. This can’t be undone.',
      primaryAction: { label: 'Cancel', onPress: dismissNotice },
      secondaryAction: {
        label: 'Reset',
        destructive: true,
        onPress: () => {
          dismissNotice();
          void performReset(deckIds, resettingAll ? 'All progress' : 'Selected decks');
        },
      },
    });
  };

  const closeReminderModal = () => {
    if (!isSavingReminder) setShowReminderModal(false);
  };

  const closeResetModal = () => {
    if (!isResetting) {
      resetLoadRequest.current += 1;
      setShowResetModal(false);
    }
  };

  const activeForm: DialogOptions | null = showReminderModal
    ? {
        title: 'Daily reminder',
        message: 'A daily nudge to open Tusavor.',
        primaryAction: {
          label: 'Save',
          onPress: handleSaveReminder,
          disabled: isSavingReminder,
          busy: isSavingReminder,
        },
        secondaryAction: {
          label: 'Cancel',
          onPress: closeReminderModal,
          disabled: isSavingReminder,
        },
        onDismiss: closeReminderModal,
      }
    : showResetModal
      ? {
          title: 'Reset study progress',
          message: 'Choose decks to make their cards unseen. Shared cards reset in every deck.',
          primaryAction: {
            label: 'Cancel',
            onPress: closeResetModal,
            disabled: isResetting,
          },
          secondaryAction: {
            label: `Reset${selectedDeckIds.size > 0 ? ` (${selectedDeckIds.size})` : ''}`,
            onPress: handleResetConfirm,
            destructive: true,
            disabled: isResetting || isLoadingDecks || decks.length === 0,
            busy: isResetting,
          },
          onDismiss: closeResetModal,
        }
      : null;
  const currentDialog = activeForm ?? notice;

  // Keep one native host through form/notice transitions. Confirmation and
  // recoverable errors sit inside that host so iOS never stacks native modals.
  const popup = (
    <AppDialog
      visible={currentDialog !== null}
      title={currentDialog?.title ?? ''}
      message={currentDialog?.message}
      primaryAction={currentDialog?.primaryAction ?? { label: 'OK', onPress: dismissNotice }}
      secondaryAction={currentDialog?.secondaryAction}
      layout={currentDialog?.layout}
      onDismiss={() => {
        if (notice) {
          (notice.onDismiss ?? dismissNotice)();
        } else {
          currentDialog?.onDismiss?.();
        }
      }}
      overlay={activeForm && notice ? (
        <AppDialog
          {...notice}
          visible
          inline
          onDismiss={notice.onDismiss ?? dismissNotice}
        />
      ) : undefined}
    >
      {showReminderModal ? (
        <View style={styles.reminderContent}>
          <View style={styles.reminderToggleRow}>
            <View style={styles.reminderToggleCopy}>
              <Text style={styles.reminderToggleLabel}>Reminder</Text>
              <Text style={styles.reminderToggleDetail}>
                {reminderDraftEnabled
                  ? `On at ${formatDailyReminderTime(
                      reminderDraftTime.hour,
                      reminderDraftTime.minute,
                      deviceUses24HourClock,
                    )}`
                  : 'Off'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily reminder"
              value={reminderDraftEnabled}
              onValueChange={setReminderDraftEnabled}
              disabled={isSavingReminder}
              trackColor={{ false: COLORS.paperHair, true: COLORS.amber }}
              thumbColor={COLORS.paper}
            />
          </View>

          <ReminderTimeWheel
            time={reminderDraftTime}
            uses24HourClock={deviceUses24HourClock}
            disabled={!reminderDraftEnabled || isSavingReminder}
            onChange={setReminderDraftTime}
          />
        </View>
      ) : showResetModal ? (
        isLoadingDecks ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={COLORS.inkMute} />
          </View>
        ) : (
          <View style={styles.resetContent}>
            <Pressable
              style={styles.selectAllRow}
              onPress={toggleSelectAll}
              disabled={decks.length === 0 || isResetting}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected, disabled: decks.length === 0 || isResetting }}
            >
              <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                {allSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.selectAllText}>Select all decks</Text>
            </Pressable>

            <ScrollView style={styles.deckList} nestedScrollEnabled contentContainerStyle={{ paddingBottom: 8 }}>
              {decks.length === 0 ? (
                <Text style={styles.emptyText}>No decks available.</Text>
              ) : (
                decks.map((deck) => {
                  const isSelected = selectedDeckIds.has(deck.id);
                  return (
                    <Pressable
                      key={deck.id}
                      style={styles.deckRow}
                      onPress={() => toggleDeck(deck.id)}
                      disabled={isResetting}
                      accessibilityRole="checkbox"
                      accessibilityLabel={deck.title}
                      accessibilityState={{ checked: isSelected, disabled: isResetting }}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.deckTitle}>{deck.title}</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        )
      ) : null}
    </AppDialog>
  );

  const reminderDetail = isLoadingReminder
    ? 'Loading...'
    : isReminderUnavailable
      ? 'Unavailable'
      : reminderSettings?.enabled
        ? `On at ${formatDailyReminderTime(
            reminderSettings.hour,
            reminderSettings.minute,
            deviceUses24HourClock,
          )}`
        : 'Off';

  if (showPrivacy) {
    return (
      <>
        <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />
        {popup}
      </>
    );
  }

  if (showDeleteAccount) {
    return (
      <View style={styles.screen}>
        <View style={[styles.subHeader, { paddingTop: insets.top + 14 }]}>
          <Pressable
            onPress={() => setShowDeleteAccount(false)}
            hitSlop={12}
            disabled={isDeleting}
            style={styles.backRow}
          >
            <BackChevron />
            <Text style={styles.backLink}>My Account</Text>
          </Pressable>
        </View>
        <Text style={styles.pageTitle}>Delete Account</Text>
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.warningContent, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={styles.warningHeading}>This cannot be undone.</Text>
          <Text style={styles.warningBody}>Deleting your account will permanently erase:</Text>
          <View style={styles.warningList}>
            {[
              'Your login and profile',
              'All study progress and FSRS ratings',
              'Your study history and session stats',
            ].map((item) => (
              <View key={item} style={styles.warningItem}>
                <View style={styles.warningBullet} />
                <Text style={styles.warningItemText}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.warningBody}>
            You will be signed out immediately. If you change your mind later, you'll
            need to ask your restaurant admin to create a new account for you.
          </Text>
          <Text style={styles.warningBody}>
            If you only want to start fresh on your cards, use{' '}
            <Text style={styles.warningEmphasis}>Reset Study Progress</Text> instead —
            that keeps your account.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.destructiveButton, pressed && styles.buttonPressed]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.paper} />
            ) : (
              <Text style={styles.destructiveButtonText}>Delete Account</Text>
            )}
          </Pressable>
        </ScrollView>
        {popup}
      </View>
    );
  }

  if (showAccount) {
    return (
      <View style={styles.screen}>
        <View style={[styles.subHeader, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={() => setShowAccount(false)} hitSlop={12} style={styles.backRow}>
            <BackChevron />
            <Text style={styles.backLink}>Settings</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.pageTitle}>My Account</Text>
          <View style={styles.group}>
            <NavRow label="Export My Data" onPress={handleExportData} busy={isExporting} />
            <NavRow label="Delete Account" onPress={() => setShowDeleteAccount(true)} />
          </View>
        </View>
        {popup}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Dark masthead — sibling of the Study masthead. */}
      <View style={[styles.masthead, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.eyebrow}>{restaurant?.name ?? ''}</Text>
        <Text style={styles.headline}>Settings.</Text>
        {/* Empty band standing in for the Study tab's toggle / Library tab's
            sub-tab strip, so this masthead is the same height — and carries the
            same bottom hairline — even with no controls to host. */}
        <View style={styles.mastheadStrip} />
      </View>

      <View style={styles.body}>
        <View style={styles.group}>
          <NavRow
            label="Daily Reminder"
            detail={reminderDetail}
            onPress={openReminderModal}
            busy={isLoadingReminder}
          />
          <NavRow label="Reset Study Progress" onPress={openResetModal} />
        </View>

        <View style={[styles.group, styles.groupSpaced]}>
          <NavRow label="My Account" onPress={() => setShowAccount(true)} />
          <NavRow label="Privacy Policy" onPress={() => setShowPrivacy(true)} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>

      {popup}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },

  // ── Dark masthead ──────────────────────────────────────────
  masthead: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
  },
  // Stands in for the toggle band the Study and Library mastheads carry:
  // a 22px drop from the headline, then a label-height band closed by the
  // bgHair hairline. Heightless of any control, but exactly as tall.
  mastheadStrip: {
    marginTop: 22,
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
  },
  eyebrow: {
    color: COLORS.amber,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  headline: {
    color: COLORS.onDark,
    fontFamily: 'Fraunces_500Medium',
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1.1,
  },

  // ── Sub-page header (My Account / Delete Account) ──────────
  // Slim dark bar carrying only the back link; the page title sits on paper
  // below, the way a Glossary entry's title does.
  subHeader: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 26,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgHair,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
  },
  backLink: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: COLORS.onDarkMute,
  },
  pageTitle: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 16,
  },

  // ── Paper body ─────────────────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },

  // ── Ruled rows ─────────────────────────────────────────────
  group: {
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  groupSpaced: {
    marginTop: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  rowPressed: {
    backgroundColor: COLORS.paperSoft,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 16,
  },
  rowLabel: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 21,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  rowDetail: {
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
  },

  // ── Buttons ────────────────────────────────────────────────
  buttonPressed: {
    opacity: 0.7,
  },
  logoutButton: {
    marginTop: 36,
    marginHorizontal: 26,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  logoutButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: COLORS.red,
  },
  destructiveButton: {
    marginTop: 28,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: COLORS.red,
  },
  destructiveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: COLORS.paper,
  },

  // ── Delete-account warning ─────────────────────────────────
  warningContent: {
    paddingHorizontal: 26,
    paddingTop: 4,
  },
  warningHeading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: COLORS.red,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  warningBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.inkMute,
    lineHeight: 23,
    marginBottom: 14,
  },
  warningEmphasis: {
    fontFamily: 'Inter_500Medium',
    color: COLORS.ink,
  },
  warningList: {
    marginBottom: 14,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  warningBullet: {
    width: 5,
    height: 5,
    marginTop: 8,
    marginRight: 12,
    backgroundColor: COLORS.inkFaint,
  },
  warningItemText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.inkMute,
    lineHeight: 23,
  },

  // ── Paper dialog forms ─────────────────────────────────────
  modalLoading: {
    padding: 36,
    alignItems: 'center',
  },
  reminderContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 20,
  },
  reminderToggleCopy: {
    flex: 1,
  },
  reminderToggleLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.ink,
  },
  reminderToggleDetail: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.inkMute,
  },
  timeWheel: {
    flexDirection: 'row',
    height: WHEEL_PICKER_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.paperHair,
    backgroundColor: COLORS.paperSoft,
    overflow: 'hidden',
  },
  timeWheelDisabled: {
    opacity: 0.42,
  },
  wheelPicker: {
    flex: 1,
    minWidth: 0,
    height: WHEEL_PICKER_HEIGHT,
    overflow: 'hidden',
  },
  wheelSelectionBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: WHEEL_VERTICAL_PADDING,
    height: WHEEL_ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.paperHair,
    backgroundColor: 'rgba(232, 154, 43, 0.09)',
  },
  wheelScroll: {
    height: WHEEL_PICKER_HEIGHT,
  },
  wheelContent: {
    paddingVertical: WHEEL_VERTICAL_PADDING,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.inkFaint,
  },
  wheelItemTextSelected: {
    color: COLORS.ink,
  },
  resetContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.paperSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  selectAllText: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.ink,
  },
  deckList: {
    maxHeight: 280,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: COLORS.inkFaint,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.amber,
    borderColor: COLORS.amber,
  },
  checkmark: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  deckTitle: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.ink,
  },
  emptyText: {
    paddingHorizontal: 8,
    paddingVertical: 20,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.inkMute,
  },
});
