import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  StudentDeck,
  StudyDeckSearchMatch,
  StudyDeckSearchMatchDetail,
} from '../types/shared';
import {
  mergeSearchMatches,
  textContainsQuery,
  formatSearchFieldLabel,
} from '../utils/studySearch';

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

export type Mode = 'recommended' | 'full' | 'browse' | 'custom';

// How long a deck must be held to toggle Favorites. The grow animation ramps
// over this same window so the swell peaks exactly as the toggle fires.
const LONG_PRESS_MS = 600;

// One deck row. Each row owns its scale `Animated.Value`, created fresh on
// mount — so when a favorite toggle reorders the list and remounts this row
// under a new section, it starts at rest. Sharing one value across remounts
// (e.g. a parent-held map) leaves the native transform clinging to the old
// node and the row stuck at the grown size, so we deliberately don't.
//
// Holding grows the row steadily over the long-press window (feedback that
// something's coming); `onLongPress` then commits the favorite toggle. Released
// early, the swell springs back. `isFirstInGroup` drops the top divider so each
// section's first row sits flush under its header.
export function DeckRow({
  deck,
  isFirstInGroup,
  isFavorite,
  mode,
  isSearching,
  searchQuery,
  searchMatches,
  onTap,
  onToggleFavorite,
}: {
  deck: StudentDeck;
  isFirstInGroup: boolean;
  isFavorite: boolean;
  mode: Mode;
  isSearching: boolean;
  searchQuery: string;
  searchMatches: StudyDeckSearchMatch[];
  onTap: (deck: StudentDeck) => void;
  onToggleFavorite: (deck: StudentDeck) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const grow = () =>
    Animated.timing(scale, {
      toValue: 1.08,
      duration: LONG_PRESS_MS,
      useNativeDriver: true,
    }).start();
  const settle = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => onTap(deck)}
        onPressIn={grow}
        onPressOut={settle}
        onLongPress={() => onToggleFavorite(deck)}
        delayLongPress={LONG_PRESS_MS}
        style={({ pressed }) => [
          styles.row,
          !isFirstInGroup && styles.rowDivider,
          pressed && styles.rowPressed,
        ]}
      >
        {isFavorite && (
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            style={styles.favoriteStar}
            accessibilityLabel="Favorite"
          >
            <Path
              d="M12 1.5 l3.09 6.91 7.41.57 -5.71 4.83 1.85 7.19 -6.64-4.13 -6.64 4.13 1.85-7.19 -5.71-4.83 7.41-.57 z"
              fill={COLORS.amber}
            />
          </Svg>
        )}

        <Text style={[styles.deckTitle, isFavorite && styles.deckTitleFavorite]}>
          {deck.title}
        </Text>

        {isSearching ? (
          <SearchMatchList matches={searchMatches} query={searchQuery} />
        ) : !!deck.description ? (
          <Text style={styles.deckDescription} numberOfLines={2}>
            {deck.description}
          </Text>
        ) : null}

        {!isSearching && (
          <DeckStats
            key={`${deck.masteredCards}-${deck.learningCards}-${deck.weakCards}-${deck.cardCount}`}
            deck={deck}
            mode={mode}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

function SearchMatchList({ matches, query }: { matches: StudyDeckSearchMatch[]; query: string }) {
  const visibleMatches = mergeSearchMatches(matches).filter(match => match.itemName);
  if (visibleMatches.length === 0) return null;

  return (
    <View style={styles.searchMatchList}>
      {visibleMatches.map((match, index) => {
        const titleMatches = textContainsQuery(match.itemName, query);
        const detailLines = titleMatches ? [] : match.details;

        return (
          <View key={`${match.itemName}-${index}`} style={styles.searchMatchItem}>
            <Svg
              width={13}
              height={13}
              viewBox="0 0 15 15"
              style={styles.searchMatchIcon}
            >
              <Circle cx={6.3} cy={6.3} r={4.6} stroke={COLORS.amber} strokeWidth={1.4} fill="none" />
              <Line x1={9.7} y1={9.7} x2={13.6} y2={13.6} stroke={COLORS.amber} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <View style={styles.searchMatchCopy}>
              <HighlightedMatchText text={match.itemName} query={query} />
              {detailLines.map((detail, detailIndex) => (
                <HighlightedMatchDetail
                  key={`${detail.field}-${detail.value}-${detailIndex}`}
                  detail={detail}
                  query={query}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function HighlightedMatchDetail({
  detail,
  query,
}: {
  detail: StudyDeckSearchMatchDetail;
  query: string;
}) {
  return (
    <HighlightedMatchText
      text={`${detail.value} (${formatSearchFieldLabel(detail.field)})`}
      query={query}
      variant="detail"
    />
  );
}

function HighlightedMatchText({
  text,
  query,
  variant = 'title',
}: {
  text: string;
  query: string;
  variant?: 'title' | 'detail';
}) {
  const textStyle = [
    styles.searchMatchText,
    variant === 'detail' ? styles.searchMatchDetailText : undefined,
  ];
  const q = query.trim().toLowerCase();
  if (!q) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    const index = lower.indexOf(q, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), isMatch: false });
    }
    parts.push({ text: text.slice(index, index + q.length), isMatch: true });
    cursor = index + q.length;
  }

  return (
    <Text style={textStyle}>
      {parts.map((part, index) => (
        <Text
          key={`${part.text}-${index}`}
          style={part.isMatch ? styles.searchMatchTextAmber : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

// The stats line shows three mastery counts in `recommended` and a single
// card count in `full`/`browse`. Switching modes plays a left-anchored reveal:
// the line's right edge slides between the long form's "Weak" tip and the
// short form's "Cards" tip, while the two forms crossfade. Both forms are
// stacked left-aligned inside a clip whose width animates between their two
// natural widths — so the right edge is the only thing that travels.
//
// Those two widths (and the line height for the absolutely-stacked forms) have
// to be measured first; until then we render the active form at natural size,
// with an invisible pass laying out both forms to capture their dimensions.
// The row is keyed on its counts upstream, so a study session that changes a
// figure remounts this and re-measures.
function DeckStats({ deck, mode }: { deck: StudentDeck; mode: Mode }) {
  const fullyMastered = deck.weakCards === 0 && deck.learningCards === 0;
  const [dims, setDims] = useState<{
    recW: number;
    compactW: number;
    h: number;
  } | null>(null);
  const width = useRef(new Animated.Value(0)).current;
  // 1 = recommended form fully shown, 0 = compact form fully shown.
  const recShown = useRef(
    new Animated.Value(mode === 'recommended' ? 1 : 0),
  ).current;
  const measured = useRef<{ recW?: number; compactW?: number; h?: number }>({});

  const renderRec = () => (
    <>
      <Stat label="Mastered" value={deck.masteredCards} />
      <Stat label="Learning" value={deck.learningCards} />
      <Stat label="Weak" value={deck.weakCards} weak />
    </>
  );
  const renderCompact = () => <Stat label="Cards" value={deck.cardCount} />;

  const finishMeasure = () => {
    const m = measured.current;
    if (m.recW == null || m.compactW == null || m.h == null) return;
    // Seat the clip at its resting width before the clipped layer first paints.
    width.setValue(mode === 'recommended' ? m.recW : m.compactW);
    setDims({ recW: m.recW, compactW: m.compactW, h: m.h });
  };

  // Slide the right edge to the new form's tip and crossfade the figures.
  useEffect(() => {
    if (!dims) return;
    const isRec = mode === 'recommended';
    Animated.parallel([
      Animated.timing(width, {
        toValue: isRec ? dims.recW : dims.compactW,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(recShown, {
        toValue: isRec ? 1 : 0,
        // Hold the old form while the edge starts moving, then crossfade in the
        // back half of the slide so the swap reads as "becomes its new form at
        // the tip" rather than ghosting both at the fixed left edge.
        delay: 110,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [mode, dims, width, recShown]);

  const compactShown = recShown.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.statsRow}>
      {dims ? (
        <Animated.View style={[styles.statsClip, { width, height: dims.h }]}>
          <Animated.View
            style={[styles.statGroup, styles.statsForm, { opacity: recShown }]}
          >
            {renderRec()}
          </Animated.View>
          <Animated.View
            style={[styles.statGroup, styles.statsForm, { opacity: compactShown }]}
          >
            {renderCompact()}
          </Animated.View>
        </Animated.View>
      ) : (
        <View>
          <View style={styles.statGroup}>
            {mode === 'recommended' ? renderRec() : renderCompact()}
          </View>
          <View style={styles.statsMeasure} pointerEvents="none">
            <View
              style={styles.statGroup}
              onLayout={e => {
                measured.current.recW = e.nativeEvent.layout.width;
                measured.current.h = e.nativeEvent.layout.height;
                finishMeasure();
              }}
            >
              {renderRec()}
            </View>
            <View
              style={styles.statGroup}
              onLayout={e => {
                measured.current.compactW = e.nativeEvent.layout.width;
                finishMeasure();
              }}
            >
              {renderCompact()}
            </View>
          </View>
        </View>
      )}
      {fullyMastered && <Text style={styles.allMastered}>All mastered</Text>}
    </View>
  );
}

// When the `weak` count is non-zero, both its figure and label ring red —
// the "needs attention" signal. Any count of 0 drops the figure to inkMute
// so the row reads quiet; every non-red label sits faint (inkFaint).
function Stat({
  label,
  value,
  weak,
}: {
  label: string;
  value: number;
  weak?: boolean;
}) {
  const isRed = !!weak && value > 0;
  const isZero = value === 0;
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statFigure,
          isZero && styles.statFigureMuted,
          isRed && styles.statFigureRed,
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, isRed && styles.statLabelRed]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Deck row ───────────────────────────────────────────────
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

  favoriteStar: {
    position: 'absolute',
    top: 20,
    right: 22,
  },

  deckTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: COLORS.ink,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  deckTitleFavorite: {
    paddingRight: 28, // leaves room for the star
  },

  deckDescription: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMute,
    marginTop: 8,
  },
  searchMatchList: {
    marginTop: 10,
    gap: 7,
  },
  searchMatchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchMatchIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  searchMatchCopy: {
    flex: 1,
  },
  searchMatchText: {
    fontFamily: 'Newsreader_500Medium_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMute,
  },
  searchMatchDetailText: {
    marginTop: 2,
    color: COLORS.inkFaint,
  },
  searchMatchTextAmber: {
    color: COLORS.amber,
  },

  // ── Stats row ──────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  // Holds the mastery/card figures; the gap that used to sit on statsRow lives
  // here now so "All mastered" can still pin right of it.
  statGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 18,
  },
  // Window onto the stacked forms; its animated width is the sliding right edge.
  statsClip: { overflow: 'hidden' },
  // Both forms share the top-left origin so only the right edge ever moves.
  statsForm: { position: 'absolute', left: 0, top: 0 },
  // Off-paint layout pass used only to capture both forms' natural sizes.
  // alignItems flex-start is load-bearing: this column would otherwise stretch
  // both forms to the wider one's width, making the two measurements equal and
  // leaving the reveal with no width to animate.
  statsMeasure: { position: 'absolute', left: 0, top: 0, opacity: 0, alignItems: 'flex-start' },
  stat: { flexDirection: 'row', alignItems: 'baseline' },
  statFigure: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: COLORS.ink,
    letterSpacing: -0.18,
    marginRight: 6,
  },
  statFigureMuted: { color: COLORS.inkMute },
  statFigureRed: { color: COLORS.red },
  statLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: COLORS.inkFaint,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  statLabelRed: { color: COLORS.red },

  allMastered: {
    fontFamily: 'Inter_700Bold',
    marginLeft: 'auto',
    fontSize: 9,
    color: COLORS.inkFaint,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
