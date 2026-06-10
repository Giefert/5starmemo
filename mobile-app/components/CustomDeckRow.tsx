import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CustomStudyDeck, getCustomDeckCounts } from '../utils/customDecks';

// Carte tokens — shared with BulletinScreen so the two tabs read as one app.
const COLORS = {
  bg: '#14120F',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  ink: '#14120F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  onDark: '#E8E3D6',
  onDarkMuted: '#8A8578',
  amber: '#E89A2B',
  red: '#D94B36',
};

export function CustomDeckRow({
  deck,
  isFirstInGroup,
  disabled,
  onTap,
  onDelete,
}: {
  deck: CustomStudyDeck;
  isFirstInGroup: boolean;
  disabled: boolean;
  onTap: (deck: CustomStudyDeck) => void;
  onDelete: (deck: CustomStudyDeck) => void;
}) {
  const counts = getCustomDeckCounts(deck);
  const detail =
    counts.cards > 0 && counts.reference > 0
      ? `${counts.cards} cards / ${counts.reference} reference`
      : counts.cards > 0
      ? `${counts.cards} cards`
      : `${counts.reference} reference`;

  return (
    <Pressable
      onPress={() => onTap(deck)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        !isFirstInGroup && styles.rowDivider,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <Text style={styles.deckTitle}>{deck.title}</Text>
      <Text style={styles.deckDescription} numberOfLines={2}>
        {detail}
      </Text>
      <View style={styles.customRowFooter}>
        <Text style={styles.customRowMeta}>
          Local only / not logged
        </Text>
        <Pressable
          onPress={event => {
            event.stopPropagation();
            onDelete(deck);
          }}
          hitSlop={10}
        >
          <Text style={styles.customDelete}>DELETE</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    position: 'relative',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  rowPressed: { opacity: 0.6 },
  rowDisabled: { opacity: 0.45 },

  deckTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: COLORS.ink,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  deckDescription: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMute,
    marginTop: 8,
  },
  customRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  customRowMeta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
  },
  customDelete: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.3,
    color: COLORS.red,
  },
});
