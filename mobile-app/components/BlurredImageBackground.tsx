import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

interface BlurredImageBackgroundProps {
  imageUrl: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'paper' | 'ink';
}

export function BlurredImageBackground({
  imageUrl,
  style,
  tone = 'paper',
}: BlurredImageBackgroundProps) {
  const isInk = tone === 'ink';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        isInk ? styles.inkBackground : styles.paperBackground,
        style,
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        blurRadius={32}
        cachePolicy="memory-disk"
        priority="low"
      />
      <View style={[styles.overlay, isInk ? styles.inkOverlay : styles.paperOverlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  inkBackground: {
    backgroundColor: '#14120F',
  },
  paperBackground: {
    backgroundColor: '#F4EEE1',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.15 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  inkOverlay: {
    backgroundColor: 'rgba(20,18,15,0.32)',
  },
  paperOverlay: {
    backgroundColor: 'rgba(20,18,15,0.12)',
  },
});
