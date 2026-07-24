import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMatches } from "../services/swipe.api";

function getOtherUser(match, currentUserId) {
  return match.users?.find((user) => user._id !== currentUserId && user.id !== currentUserId) || match.users?.[0];
}

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listAnimation = useRef(new Animated.Value(0)).current;

  const loadMatches = useCallback(async () => {
    const data = await getMatches();
    setMatches(data);
  }, []);

  useEffect(() => {
    loadMatches()
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [loadMatches]);

  useEffect(() => {
    if (loading) {
      return;
    }

    listAnimation.setValue(0);
    Animated.timing(listAnimation, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [listAnimation, loading, matches.length]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadMatches();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ff4458" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
      </View>
      <Animated.FlatList
        data={matches}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ff4458" />}
        contentContainerStyle={matches.length ? styles.list : styles.emptyList}
        style={[
          styles.listSurface,
          {
            opacity: listAnimation,
            transform: [
              {
                translateY: listAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>Keep exploring and your conversations will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const otherUser = getOtherUser(item, user?.id);
          const photoUrl = otherUser?.photos?.[0]?.url;

          return (
            <Pressable
              style={({ hovered, pressed }) => [
                styles.row,
                hovered && styles.rowHover,
                pressed && styles.rowPressed,
              ]}
              onPress={() => navigation.navigate("Chat", { match: item, user: otherUser })}
            >
              {({ hovered }) => (
                <>
                  <View style={[styles.avatar, hovered && styles.avatarHover]}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <Image
                        source={{
                          uri: "https://i.pravatar.cc/300",
                        }}
                        style={styles.avatarImage}
                      />
                    )}
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.name, hovered && styles.nameHover]}>
                      {otherUser?.name || "Match"}
                    </Text>
                    <Text
                      style={[styles.message, hovered && styles.messageHover]}
                      numberOfLines={1}
                    >
                      {item.lastMessage?.text || "Start the conversation"}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, hovered && styles.chevronHover]}>
                    {">"}
                  </Text>
                </>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101010",
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
  },
  list: {
    paddingVertical: 8,
  },
  listSurface: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 8,
    marginHorizontal: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowHover: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#121010",
    transform: [{ translateX: 4 }],
  },
  rowPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "#1d1a1a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarHover: {
    borderColor: "#ff4458",
    transform: [{ scale: 1.04 }],
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#ff4458",
    fontSize: 22,
    fontWeight: "900",
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  nameHover: {
    color: "#ffffff",
  },
  message: {
    color: "#bfb8b8",
    fontSize: 14,
  },
  messageHover: {
    color: "#ffffff",
  },
  chevron: {
    color: "#5f5858",
    fontSize: 28,
  },
  chevronHover: {
    color: "#ffffff",
    transform: [{ translateX: 3 }],
  },
  empty: {
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  emptyText: {
    color: "#bfb8b8",
    textAlign: "center",
    lineHeight: 20,
  },
});
