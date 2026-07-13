import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { GlossaryTermSummary } from '../types/shared';
import { cleanHtml, customHTMLElementModels } from '../utils/html';

const COLORS = {
  ink: '#14120F',
  inkMute: '#6B6255',
  inkFaint: '#A89B7E',
  paper: '#F4EEE1',
  paperHair: '#D8CFB8',
  amber: '#E89A2B',
};

interface LibraryStudyCardProps {
  term: GlossaryTermSummary;
  isFlipped: boolean;
}

export const LibraryStudyCard: React.FC<LibraryStudyCardProps> = ({
  term,
  isFlipped,
}) => {
  const { width } = useWindowDimensions();
  const sectionLabel = term.section === 'encyclopedia' ? 'Encyclopedia' : 'Glossary';

  if (!isFlipped) {
    return (
      <View style={[styles.cardContainer, styles.cardFront]}>
        <View style={styles.frontHeader}>
          <Text style={styles.eyebrow}>
            {term.section === 'encyclopedia' ? 'Explain' : 'Define'}
          </Text>
          <Text style={styles.frontTitle}>{term.term}</Text>
          {!!term.categoryName && (
            <Text style={styles.frontMeta}>{term.categoryName}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, styles.cardBack]}>
      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator>
        <View style={styles.backHeader}>
          <Text style={[styles.eyebrow, styles.eyebrowBack]}>
            {[sectionLabel, term.categoryName].filter(Boolean).join(' / ')}
          </Text>
          <Text style={styles.backTitle}>{term.term}</Text>
        </View>

        <View style={styles.backBody}>
          <RenderHtml
            contentWidth={width - 56}
            source={{ html: cleanHtml(term.definition) }}
            baseStyle={styles.definition}
            enableExperimentalMarginCollapsing={true}
            customHTMLElementModels={customHTMLElementModels}
            tagsStyles={{
              p: { marginVertical: 5 },
              ul: { marginVertical: 8, paddingLeft: 0 },
              li: { marginVertical: 0, paddingVertical: 2 },
              strong: { fontFamily: 'Inter_700Bold' },
              em: { fontStyle: 'italic' },
              u: { textDecorationLine: 'underline' },
              h1: { fontFamily: 'Fraunces_600SemiBold', fontSize: 25, lineHeight: 31, color: COLORS.ink, marginVertical: 8 },
              h2: { fontFamily: 'Fraunces_600SemiBold', fontSize: 21, lineHeight: 27, color: COLORS.ink, marginVertical: 6 },
              h3: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18, lineHeight: 24, color: COLORS.ink, marginVertical: 5 },
            }}
            classesStyles={{
              'font-large': { fontSize: 18 },
              'font-larger': { fontSize: 22 },
              'font-largest': { fontSize: 28 },
            }}
            renderersProps={{
              ul: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
              ol: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    width: '100%',
  },
  cardFront: {
    backgroundColor: COLORS.ink,
    justifyContent: 'center',
  },
  cardBack: {
    backgroundColor: COLORS.paper,
  },
  frontHeader: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  frontTitle: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '500',
    color: COLORS.paper,
    textAlign: 'center',
    lineHeight: 46,
  },
  frontMeta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: COLORS.inkFaint,
    marginTop: 18,
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: COLORS.amber,
    marginBottom: 12,
    textAlign: 'center',
  },
  eyebrowBack: {
    textAlign: 'left',
    marginBottom: 10,
  },
  detailsScroll: {
    flex: 1,
  },
  backHeader: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 16,
  },
  backTitle: {
    fontFamily: 'Georgia',
    fontSize: 31,
    fontWeight: '500',
    color: COLORS.ink,
    lineHeight: 34,
  },
  backBody: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperHair,
  },
  definition: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.ink,
  },
});
