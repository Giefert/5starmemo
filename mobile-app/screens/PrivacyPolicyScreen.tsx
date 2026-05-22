import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import Svg, { Path } from 'react-native-svg';
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_MARKDOWN,
} from '../../shared/legal/privacy';

// Carte tokens — shared with the Settings tab so this sub-page reads as part
// of the same app.
const COLORS = {
  ink: '#14120F',
  bgHair: '#28251F',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  inkMute: '#6B6255',
  onDarkMute: '#8A8578',
  amber: '#E89A2B',
};

interface Props {
  onBack: () => void;
}

export default function PrivacyPolicyScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
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
          <Text style={styles.backLink}>Settings</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective date: {PRIVACY_POLICY_EFFECTIVE_DATE}</Text>
        <Markdown
          style={markdownStyles}
          onLinkPress={(url) => {
            Linking.openURL(url);
            return false;
          }}
        >
          {PRIVACY_POLICY_MARKDOWN}
        </Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  header: {
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
  title: {
    color: COLORS.ink,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: 24,
  },
  effectiveDate: {
    fontFamily: 'Newsreader_500Medium_Italic',
    color: COLORS.inkMute,
    marginBottom: 20,
    fontSize: 14,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Inter_400Regular',
    color: COLORS.inkMute,
    fontSize: 15,
    lineHeight: 23,
  },
  heading2: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    letterSpacing: -0.4,
    marginTop: 24,
    marginBottom: 10,
    color: COLORS.ink,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 14,
  },
  link: {
    color: COLORS.amber,
  },
  list_item: {
    marginBottom: 6,
  },
  bullet_list: {
    marginBottom: 14,
  },
  strong: {
    fontFamily: 'Inter_500Medium',
    color: COLORS.ink,
  },
  em: {
    fontFamily: 'Newsreader_500Medium_Italic',
  },
});
