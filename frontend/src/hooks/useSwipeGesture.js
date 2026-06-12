import { useRef } from "react";
import { Animated, Dimensions, PanResponder } from "react-native";

const threshold = Dimensions.get("window").width * 0.26;

export default function useSwipeGesture({ onSwipeLeft, onSwipeRight, onSwipeUp } = {}) {
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ["-13deg", "0deg", "13deg"],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -threshold) {
          Animated.timing(position, {
            toValue: { x: gesture.dx, y: -900 },
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeUp?.();
          });
          return;
        }

        if (gesture.dx > threshold) {
          Animated.timing(position, {
            toValue: { x: 900, y: gesture.dy },
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeRight?.();
          });
          return;
        }

        if (gesture.dx < -threshold) {
          Animated.timing(position, {
            toValue: { x: -900, y: gesture.dy },
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeLeft?.();
          });
          return;
        }

        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    cardStyle: {
      transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
    },
    position,
  };
}
