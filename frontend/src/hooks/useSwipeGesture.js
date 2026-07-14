import { useEffect, useRef } from "react";
import { Animated, Dimensions, PanResponder } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.75;
const QUICK_SWIPE_VELOCITY = 0.6;

export default function useSwipeGesture({
  currentUser,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
} = {}) {
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-20deg", "0deg", "20deg"],
    extrapolate: "clamp",
  });

const currentUserRef = useRef(currentUser);

useEffect(() => {
  currentUserRef.current = currentUser;
}, [currentUser]);

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const forceSwipeRight = (dy = 0) => {
    Animated.timing(position, {
      toValue: {
        x: SCREEN_WIDTH * 1.5,
        y: dy,
      },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipeRight?.(currentUserRef.current);
    });
  };

  const forceSwipeLeft = (dy = 0) => {
    Animated.timing(position, {
      toValue: {
        x: -SCREEN_WIDTH * 1.5,
        y: dy,
      },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipeLeft?.(currentUserRef.current);
    });
  };

  const forceSwipeUp = (dx = 0) => {
    Animated.timing(position, {
      toValue: {
        x: dx,
        y: -SCREEN_WIDTH * 1.5,
      },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onSwipeUp?.(currentUserRef.current);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 ||
        Math.abs(gesture.dy) > 5,

      onPanResponderMove: (_, gesture) => {
        position.setValue({
          x: gesture.dx,
          y: gesture.dy,
        });
      },
      onPanResponderGrant: () => {
        if (typeof document !== "undefined") {
          document.body.style.userSelect = "none";
        }
      },
      onPanResponderTerminationRequest: () => false,

      onPanResponderRelease: (_, gesture) => {
        if (typeof document !== "undefined") {
          document.body.style.userSelect = "";
        }

        const absX = Math.abs(gesture.dx);

        const horizontalPercent = absX / SCREEN_WIDTH;

        // SUPER LIKE
        if (
          gesture.dy < -120 &&
          Math.abs(gesture.vy) > QUICK_SWIPE_VELOCITY
        ) {
          forceSwipeUp(gesture.dx);
          return;
        }

        // AUTO COMPLETE AT 75%
        if (horizontalPercent >= 0.75) {
          if (gesture.dx > 0) {
            forceSwipeRight(gesture.dy);
          } else {
            forceSwipeLeft(gesture.dy);
          }
          return;
        }

        // QUICK FLICK
        if (gesture.vx > QUICK_SWIPE_VELOCITY) {
          forceSwipeRight(gesture.dy);
          return;
        }

        if (gesture.vx < -QUICK_SWIPE_VELOCITY) {
          forceSwipeLeft(gesture.dy);
          return;
        }

        // SNAP BACK
        resetPosition();
      },

      onPanResponderTerminate: () => {
        if (typeof document !== "undefined") {
          document.body.style.userSelect = "";
        }
        resetPosition();
      },
    })
  ).current;

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.5],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.5, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return {
    panHandlers: panResponder.panHandlers,

    cardStyle: {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ],
    },

    likeOpacity,
    nopeOpacity,
    position,
  };
}