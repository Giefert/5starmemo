import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

interface StripedImagePlaceholderProps {
  style?: StyleProp<ViewStyle>;
  tone?: 'paper' | 'ink';
}

export function StripedImagePlaceholder({
  style,
  tone = 'paper',
}: StripedImagePlaceholderProps) {
  const isInk = tone === 'ink';

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={`carteStripe-${tone}`}
            patternUnits="userSpaceOnUse"
            width={12}
            height={12}
            patternTransform="rotate(45)"
          >
            <Rect
              width={12}
              height={12}
              fill={isInk ? 'rgba(244,238,225,0.025)' : 'rgba(20,18,15,0.025)'}
            />
            <Rect
              width={6}
              height={12}
              fill={isInk ? 'rgba(244,238,225,0.065)' : 'rgba(20,18,15,0.06)'}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#carteStripe-${tone})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
