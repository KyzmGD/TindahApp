import { Animated, StyleSheet, Text, View } from "react-native";
import useSwipeGesture from "../../hooks/useSwipeGesture";
import UserCard from "./UserCard";


export default function CardStack({
  users,
  remaining,
  onLike,
  onNope,
  onSuperLike,
}) {
  const currentUser = users[0];
  console.log("users length:", users.length);
console.log("currentUser:", currentUser?._id);
  const nextUser = users[1];
  const { panHandlers, cardStyle } = useSwipeGesture({
  currentUser,
  onSwipeLeft: onNope,
  onSwipeRight: onLike,
  onSwipeUp: onSuperLike,
});
  if (!currentUser) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptyText}>
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
    minHeight: 500,
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
    transform: [{ scale: 0.96 }, { translateY: 14 }],
    opacity: 0.9,
  },
  empty: {
  flex: 1,
  minHeight: 500,
  borderRadius: 22,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  gap: 8,
},
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1d2233",
  },
  emptyText: {
    textAlign: "center",
    color: "#737789",
  },
});
