import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';

interface SwipeableCardProps {
  onSwipe: () => void;
  children: React.ReactNode;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({ onSwipe, children }) => {
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      onSwipe();
    });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      onSwipe();
    });

  const gesture = Gesture.Race(flingLeft, flingRight);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
};
