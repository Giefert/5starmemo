import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { StudentDeck } from '../types/shared';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [decks, setDecks] = useState<StudentDeck[]>([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await apiService.exportData();
      await Share.share({
        message: data,
        title: 'My Tusavor Data',
      });
    } catch {
      Alert.alert('Error', 'Failed to export data. Please try again.');
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
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const openResetModal = async () => {
    setShowResetModal(true);
    setSelectedDeckIds(new Set());
    setIsLoadingDecks(true);
    try {
      const available = await apiService.getAvailableDecks();
      setDecks(available);
    } catch {
      Alert.alert('Error', 'Failed to load decks. Please try again.');
      setShowResetModal(false);
    } finally {
      setIsLoadingDecks(false);
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
      setShowResetModal(false);
      Alert.alert('Progress Reset', `${label} reset successfully.`);
    } catch {
      Alert.alert('Error', 'Failed to reset progress. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetConfirm = () => {
    if (selectedDeckIds.size === 0) {
      Alert.alert('Select a deck', 'Choose at least one deck, or use "Select all decks".');
      return;
    }
    const resettingAll = selectedDeckIds.size === decks.length;
    const message = resettingAll
      ? 'This will erase your study progress for every deck. You\'ll start fresh on all cards. Continue?'
      : `This will erase your study progress for ${selectedDeckIds.size} deck${selectedDeckIds.size === 1 ? '' : 's'}. Continue?`;
    Alert.alert(
      'Reset Progress',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            performReset(
              resettingAll ? undefined : Array.from(selectedDeckIds),
              resettingAll ? 'All progress' : 'Selected decks',
            ),
        },
      ],
    );
  };

  if (showPrivacy) {
    return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  }

  if (showDeleteAccount) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => setShowDeleteAccount(false)}
            style={styles.backButton}
            disabled={isDeleting}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Delete Account</Text>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={styles.warningHeading}>This cannot be undone.</Text>
          <Text style={styles.warningBody}>
            Deleting your account will permanently erase:
          </Text>
          <View style={styles.warningList}>
            <Text style={styles.warningListItem}>• Your login and profile</Text>
            <Text style={styles.warningListItem}>• All study progress and FSRS ratings</Text>
            <Text style={styles.warningListItem}>• Your study history and session stats</Text>
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

          <TouchableOpacity
            style={styles.destructiveButton}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.destructiveButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (showAccount) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => setShowAccount(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Account</Text>
        </View>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <Text style={styles.rowText}>Export My Data</Text>
            {isExporting ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Text style={styles.rowChevron}>›</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { marginTop: 1 }]}
            onPress={() => setShowDeleteAccount(true)}
          >
            <Text style={styles.rowText}>Delete Account</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: insets.bottom + 16 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.row}
          onPress={openResetModal}
        >
          <Text style={styles.rowText}>Reset Study Progress</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.groupSeparator} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => setShowAccount(true)}
        >
          <Text style={styles.rowText}>My Account</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { marginTop: 1 }]}
          onPress={() => setShowPrivacy(true)}
        >
          <Text style={styles.rowText}>Privacy Policy</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: insets.bottom + 16 }} />

      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent
        onRequestClose={() => !isResetting && setShowResetModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isResetting && setShowResetModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={[styles.modalHeader, { paddingTop: 16 }]}>
              <Text style={styles.modalTitle}>Reset Study Progress</Text>
              <Text style={styles.modalSubtitle}>
                Select decks to reset, or reset everything at once. This clears your
                FSRS ratings so cards behave like new.
              </Text>
            </View>

            {isLoadingDecks ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#999" />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.selectAllRow}
                  onPress={toggleSelectAll}
                  disabled={decks.length === 0}
                >
                  <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                    {allSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.selectAllText}>Select all decks</Text>
                </TouchableOpacity>

                <ScrollView style={styles.deckList} contentContainerStyle={{ paddingBottom: 8 }}>
                  {decks.length === 0 ? (
                    <Text style={styles.emptyText}>No decks available.</Text>
                  ) : (
                    decks.map((deck) => {
                      const isSelected = selectedDeckIds.has(deck.id);
                      return (
                        <TouchableOpacity
                          key={deck.id}
                          style={styles.deckRow}
                          onPress={() => toggleDeck(deck.id)}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <View style={styles.deckInfo}>
                            <Text style={styles.deckTitle} numberOfLines={1}>
                              {deck.title}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </>
            )}

            <View style={[styles.modalActions, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => setShowResetModal(false)}
                disabled={isResetting}
              >
                <Text style={styles.actionSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={handleResetConfirm}
                disabled={isResetting || isLoadingDecks || decks.length === 0}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionPrimaryText}>
                    Reset Selected{selectedDeckIds.size > 0 ? ` (${selectedDeckIds.size})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  rowChevron: {
    fontSize: 20,
    color: '#999',
  },
  separator: {
    height: 32,
  },
  groupSeparator: {
    height: 24,
  },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
  warningHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc3545',
    marginBottom: 12,
  },
  warningBody: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 12,
  },
  warningEmphasis: {
    fontWeight: '600',
  },
  warningList: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  warningListItem: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  destructiveButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#dc3545',
  },
  destructiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  modalLoading: {
    padding: 32,
    alignItems: 'center',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deckList: {
    maxHeight: 320,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#bbb',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondary: {
    backgroundColor: '#f0f0f0',
  },
  actionSecondaryText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  actionPrimary: {
    backgroundColor: '#dc3545',
  },
  actionPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
