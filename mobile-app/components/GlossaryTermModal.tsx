import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cleanHtml, customHTMLElementModels } from '../utils/html';
import { AppDialog } from './AppDialog';

const systemFonts = [...defaultSystemFonts, 'Inter_400Regular', 'Inter_600SemiBold'];

interface GlossaryTermModalProps {
  term: { term: string; definition: string } | null;
  onDismiss: () => void;
}

export const GlossaryTermModal: React.FC<GlossaryTermModalProps> = ({ term, onDismiss }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, Math.min(300, width - insets.left - insets.right - 48) - 44);

  return (
    <AppDialog
      visible={term !== null}
      title={term?.term ?? ''}
      primaryAction={{ label: 'Close', onPress: onDismiss }}
      onDismiss={onDismiss}
    >
      {term && (
        <View style={styles.content}>
          <RenderHtml
            contentWidth={contentWidth}
            source={{ html: cleanHtml(term.definition) }}
            baseStyle={styles.definition}
            systemFonts={systemFonts}
            enableExperimentalMarginCollapsing={true}
            customHTMLElementModels={customHTMLElementModels}
            tagsStyles={{
              p: { marginVertical: 4 },
              ul: { marginVertical: 8, paddingLeft: 0 },
              li: { marginVertical: 0, paddingVertical: 2 },
              strong: { fontFamily: 'Inter_600SemiBold', fontWeight: 'normal' },
              em: { fontStyle: 'italic' },
              u: { textDecorationLine: 'underline' },
              hr: { marginVertical: 12, backgroundColor: '#D8CFB8' },
              h1: { fontFamily: 'Inter_600SemiBold', fontWeight: 'normal', fontSize: 20, color: '#14120F', marginVertical: 8, lineHeight: 26 },
              h2: { fontFamily: 'Inter_600SemiBold', fontWeight: 'normal', fontSize: 18, color: '#14120F', marginVertical: 6, lineHeight: 24 },
              h3: { fontFamily: 'Inter_600SemiBold', fontWeight: 'normal', fontSize: 16, color: '#14120F', marginVertical: 4, lineHeight: 22 },
            }}
            classesStyles={{
              'font-large': { fontSize: 16, lineHeight: 22 },
              'font-larger': { fontSize: 18, lineHeight: 24 },
              'font-largest': { fontSize: 20, lineHeight: 26 },
            }}
            renderersProps={{
              ul: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
              ol: { markerBoxStyle: { paddingTop: 2, paddingRight: 8 } },
            }}
          />
        </View>
      )}
    </AppDialog>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  definition: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B6255',
    lineHeight: 20.3,
  },
});
