import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import useSwipeGesture from "../../hooks/useSwipeGesture";
import UserCard from "./UserCard";
import { useTheme } from "../../theme/ThemeContext";


export default function CardStack({
  users,
  remaining,
  onLike,
  onNope,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const currentUser = users[0];
  const nextUser = users[1];
  const enterAnimation = useRef(new Animated.Value(0)).current;
  const { panHandlers, cardStyle } = useSwipeGesture({
  currentUser,
  onSwipeLeft: onNope,
  onSwipeRight: onLike,
});

  useEffect(() => {
    enterAnimation.setValue(0);
    Animated.spring(enterAnimation, {
      toValue: 1,
      tension: 70,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [currentUser?._id, enterAnimation]);

  const enterStyle = {
    opacity: enterAnimation,
  };

  if (!currentUser) {
    return (
      <View
        style={[
          styles.empty,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No more profiles</Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Check back later or widen your distance filters.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {nextUser ? (
        <UserCard
          user={nextUser}
          style={[styles.card, styles.nextCard]}
          remaining={Math.max(remaining - 1, 0)}
        />
      ) : null}
      <Animated.View
  key={currentUser?._id}
  {...panHandlers}
  style={[
    styles.card,
    styles.activeCard,
    cardStyle,
    enterStyle,
    styles.swipeCard,
  ]}
>
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <UserCard
      user={currentUser}
      style={StyleSheet.absoluteFill}
      remaining={remaining}
    />
  </View>
</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  card: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  activeCard: {
    zIndex: 2,
  },
  swipeCard: {
  userSelect: "none",
},
  nextCard: {
    transform: [{ scale: 0.94 }, { translateY: 18 }],
    opacity: 0.62,
  },
  empty: {
  flex: 1,
  width: "100%",
  height: "100%",
  borderRadius: 32,
  backgroundColor: "rgba(23,31,51,0.72)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.1)",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  gap: 8,
  shadowColor: "#ff5167",
  shadowOpacity: 0.18,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 14 },
},
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#dae2fd",
  },
  emptyText: {
    textAlign: "center",
    color: "#e6bcbd",
  },
});
