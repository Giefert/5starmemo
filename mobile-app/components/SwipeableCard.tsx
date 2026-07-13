import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_FLICK_MIN_DISTANCE = SCREEN_WIDTH * 0.08;
const SWIPE_PROJECTION_SECONDS = 0.14;
// Extra space between the front and back panels. Keeps the reverse side
// safely off-screen even if the snap-back spring overshoots a wrong-direction
// rubber-band drag, and shows a small visual seam during the reveal swipe.
const PANEL_GAP = 24;
// Rubber-band tuning for wrong-direction drags: card budges up to ~8% of
// screen width with diminishing returns, then snaps back.
const RUBBER_LIMIT = 0.08;
const RUBBER_C = 0.55;

const rubberBand = (overshoot: number): number =>
  (overshoot * RUBBER_LIMIT * RUBBER_C) / (RUBBER_LIMIT + RUBBER_C * overshoot);

interface SwipeableCardProps {
  isFlipped: boolean;
  onFlippedChange: (flipped: boolean) => void;
  front: React.ReactNode;
  back: React.ReactNode;
}

// Renders front and back panels side-by-side and translates them together so
// the reverse side follows the user's finger during the gesture. The swipe
// commits by distance or by projected velocity so fast flicks do not bounce.
export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  isFlipped,
  onFlippedChange,
  front,
  back,
}) => {
  const progress = useRef(new Animated.Value(isFlipped ? 1 : 0)).current;
  const isAnimating = useRef(false);
  const startProgress = useRef(isFlipped ? 1 : 0);

  // Animate progress to match isFlipped whenever it changes — handles taps on
  // the show-answer / back-to-question buttons. After a gesture commits the
  // animation has already run to the target, so this spring is a no-op.
  useEffect(() => {
    Animated.spring(progress, {
      toValue: isFlipped ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, progress]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startProgress.current = isFlipped ? 1 : 0;
    })
    .onUpdate((event) => {
      if (isAnimating.current) return;
      // Dragging left increases progress (toward back); right decreases (toward front).
      const delta = -event.translationX / SCREEN_WIDTH;
      const raw = startProgress.current + delta;
      let next: number;
      if (raw < 0) {
        next = -rubberBand(-raw);
      } else if (raw > 1) {
        next = 1 + rubberBand(raw - 1);
      } else {
        next = raw;
      }
      progress.setValue(next);
    })
    .onEnd((event) => {
      if (isAnimating.current) return;

      const { translationX, velocityX } = event;
      const direction = isFlipped ? 1 : -1;
      const directedDistance = translationX * direction;
      const directedVelocity = velocityX * direction;
      const projectedDistance =
        directedDistance + directedVelocity * SWIPE_PROJECTION_SECONDS;
      const passedDistance = directedDistance >= SWIPE_DISTANCE_THRESHOLD;
      const passedProjected =
        directedDistance >= SWIPE_FLICK_MIN_DISTANCE &&
        directedVelocity > 0 &&
        projectedDistance >= SWIPE_DISTANCE_THRESHOLD;
      const willFlip = passedDistance || passedProjected;
      const target = willFlip ? (isFlipped ? 0 : 1) : isFlipped ? 1 : 0;

      isAnimating.current = true;
      Animated.spring(progress, {
        toValue: target,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
        if (willFlip) onFlippedChange(!isFlipped);
      });
    });

  const frontTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_WIDTH + PANEL_GAP)],
  });
  const backTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH + PANEL_GAP, 0],
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={styles.container}>
        <Animated.View style={[styles.face, { transform: [{ translateX: frontTranslateX }] }]}>
          {front}
        </Animated.View>
        <Animated.View style={[styles.face, { transform: [{ translateX: backTranslateX }] }]}>
          {back}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
  },
});
