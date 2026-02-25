import React, { useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDE_DURATION = 200;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableCardProps {
  onSwipe: () => void;
  children: React.ReactNode;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({ onSwipe, children }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (isAnimating.current) return;
      slideAnim.setValue(event.translationX);
    })
    .onEnd((event) => {
      if (isAnimating.current) return;

      const { translationX } = event;

      if (Math.abs(translationX) < SWIPE_THRESHOLD) {
        // Snap back
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        return;
      }

      // Complete the swipe
      isAnimating.current = true;
      const direction = translationX < 0 ? 'left' : 'right';
      const offScreen = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
      const enterFrom = direction === 'left' ? SCREEN_WIDTH : -SCREEN_WIDTH;

      Animated.timing(slideAnim, {
        toValue: offScreen,
        duration: SLIDE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        onSwipe();
        slideAnim.setValue(enterFrom);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }).start(() => {
          isAnimating.current = false;
        });
      });
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
