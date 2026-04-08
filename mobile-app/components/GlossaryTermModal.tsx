import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { cleanHtml, customHTMLElementModels } from '../utils/html';

interface GlossaryTermModalProps {
  term: { term: string; definition: string } | null;
  onDismiss: () => void;
}

export const GlossaryTermModal: React.FC<GlossaryTermModalProps> = ({ term, onDismiss }) => {
  const { width } = useWindowDimensions();
  const contentWidth = width - 64 - 48; // overlay padding (32*2) + card padding (24*2)

  return (
    <Modal
      visible={term !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <View style={styles.card}>
          {term && (
            <ScrollView bounces={false} showsVerticalScrollIndicator={true}>
              <Pressable>
                <Text style={styles.termName}>{term.term}</Text>
                <View style={styles.divider} />
                <RenderHtml
                  contentWidth={contentWidth}
                  source={{ html: cleanHtml(term.definition) }}
                  baseStyle={styles.definition}
                  enableExperimentalMarginCollapsing={true}
                  customHTMLElementModels={customHTMLElementModels}
                  tagsStyles={{
                    p: { marginVertical: 4 },
                    ul: { marginVertical: 8, paddingLeft: 0 },
                    li: { marginVertical: 0, paddingVertical: 2 },
                    strong: { fontWeight: '600' },
                    em: { fontStyle: 'italic' },
                    u: { textDecorationLine: 'underline' },
                    hr: { marginVertical: 12, backgroundColor: '#E5E7EB' },
                    h1: { fontSize: 31, fontWeight: 'bold', marginVertical: 8, lineHeight: 40 },
                    h2: { fontSize: 25, fontWeight: 'bold', marginVertical: 6, lineHeight: 32 },
                    h3: { fontSize: 20, fontWeight: '600', marginVertical: 4, lineHeight: 28 },
                  }}
                  classesStyles={{
                    'font-large': { fontSize: 20 },
                    'font-larger': { fontSize: 24 },
                    'font-largest': { fontSize: 32 },
                  }}
                  renderersProps={{
                    ul: {
                      markerBoxStyle: {
                        paddingTop: 2,
                        paddingRight: 8,
                      },
                    },
                    ol: {
                      markerBoxStyle: {
                        paddingTop: 2,
                        paddingRight: 8,
                      },
                    },
                  }}
                />
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '60%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  termName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },
  definition: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
});
