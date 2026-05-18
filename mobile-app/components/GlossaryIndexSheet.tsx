import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Easing,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Carte tokens — kept in sync with GlossaryScreen / BulletinScreen / HomeScreen.
const COLORS = {
  ink: '#14120F',
  paperSoft: '#FBF7EC',
  paperHair: '#D8CFB8',
  paperHairLt: '#E6DFCB',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  amber: '#E89A2B',
};

export interface IndexSheetCategory {
  id: string;
  name: string;
  count: number;
}

interface Props {
  visible: boolean;
  // Window-space Y at which the dropdown unfurls — the bottom edge of the
  // Index row that triggered it.
  anchorY: number;
  categories: IndexSheetCategory[];
  // 'matches' while a search is filtering the list, 'entries' otherwise.
  countNoun: 'entries' | 'matches';
  onClose: () => void;
  onSelect: (categoryName: string) => void;
}

// Dropdown for jumping to an Encyclopedia category. It unfurls downward from
// the Index row that triggered it. It is a jump tool, not a filter —
// selecting a row scrolls the page, it never narrows the list.
export default function GlossaryIndexSheet({
  visible,
  anchorY,
  categories,
  countNoun,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // `mounted` keeps the Modal alive through the close animation.
  const [mounted, setMounted] = useState(visible);
  // Starts well above the clip so the panel is hidden until measured.
  const translateY = useRef(new Animated.Value(-1000)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const panelH = useRef(0);
  const opened = useRef(false);

  const runOpen = () => {
    opened.current = true;
    translateY.setValue(-panelH.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runClose = () => {
    opened.current = false;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -panelH.current,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // If the panel height is already known from a prior open, unfurl now;
      // otherwise wait for onLayout to report it.
      if (panelH.current > 0) runOpen();
    } else if (mounted) {
      runClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      panelH.current = h;
      if (visible && !opened.current) runOpen();
    }
  };

  if (!mounted) return null;

  // Keep the dropdown clear of the bottom edge; the ScrollView absorbs overflow.
  const maxHeight = Math.max(windowHeight - anchorY - insets.bottom - 16, 160);

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <View style={[styles.shadowWrap, { top: anchorY }]} pointerEvents="box-none">
          {/* Clip masks the panel as it slides down out of the Index row. */}
          <View style={styles.clip}>
            <Animated.View
              accessibilityViewIsModal
              onLayout={onPanelLayout}
              style={[styles.panel, { maxHeight, transform: [{ translateY }] }]}
            >
              <View style={styles.header}>
                <View>
                  <Text style={styles.eyebrow}>INDEX</Text>
                  <Text style={styles.title}>Jump to a category</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Text style={styles.close}>CLOSE</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                bounces={false}
              >
                {categories.map((cat, i) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => onSelect(cat.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${cat.name}, ${cat.count} ${countNoun}`}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && styles.rowDivider,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Text style={styles.rowName}>{cat.name}</Text>
                    <Text style={styles.rowCount}>
                      {cat.count} {countNoun}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 18, 15, 0.42)',
  },
  shadowWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    // The one sanctioned shadow on the Reference tab — the dropdown must lift.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  clip: {
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  panel: {
    backgroundColor: COLORS.paperSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 26,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperHair,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.amber,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 22,
    letterSpacing: -0.33,
    color: COLORS.ink,
  },
  close: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: COLORS.inkMute,
  },
  list: {
    flexShrink: 1,
    paddingHorizontal: 26,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHairLt,
  },
  rowPressed: {
    opacity: 0.55,
  },
  rowName: {
    fontFamily: 'Fraunces_500Medium',
    fontSize: 20,
    letterSpacing: -0.3,
    color: COLORS.ink,
  },
  rowCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: COLORS.inkFaint,
    fontVariant: ['tabular-nums'],
  },
});
