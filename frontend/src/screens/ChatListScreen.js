import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMatches } from "../services/swipe.api";
import { useTheme } from "../theme/ThemeContext";

function getOtherUser(match, currentUserId) {
  return match.users?.find((user) => user._id !== currentUserId && user.id !== currentUserId) || match.users?.[0];
}

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
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
      <View style={[styles.center, { backgroundColor: colors.screen }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
      </View>
      <Animated.FlatList
        data={matches}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
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
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Keep exploring and your conversations will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const otherUser = getOtherUser(item, user?.id);
          const avatarUrl = otherUser?.avatarUrl || otherUser?.photos?.[0]?.url;

          return (
            <Pressable
              style={({ hovered, pressed }) => [
                styles.row,
                hovered && {
                  borderColor: colors.border,
                  backgroundColor: colors.elevated,
                  transform: [{ translateX: 4 }],
                },
                pressed && styles.rowPressed,
              ]}
              onPress={() => navigation.navigate("Chat", { match: item, user: otherUser })}
            >
              {({ hovered }) => (
                <>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.elevated },
                      hovered && {
                        borderColor: colors.primary,
                        transform: [{ scale: 1.04 }],
                      },
                    ]}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
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
                    <Text style={[styles.name, { color: colors.text }]}>
                      {otherUser?.name || "Match"}
                    </Text>
                    <Text
                      style={[
                        styles.message,
                        { color: hovered ? colors.text : colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage?.text || "Start the conversation"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.chevron,
                      { color: hovered ? colors.text : colors.dim },
                      hovered && { transform: [{ translateX: 3 }] },
                    ]}
                  >
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
    backgroundColor: "#050506",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050506",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121016",
    borderBottomWidth: 1,
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
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "#17111c",
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
    backgroundColor: "#1c1720",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarHover: {
    borderColor: "#ff4f7b",
    transform: [{ scale: 1.04 }],
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#ff4f7b",
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
    color: "#cbbdd2",
    fontSize: 14,
  },
  messageHover: {
    color: "#ffffff",
  },
  chevron: {
    color: "#74677d",
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
    color: "#cbbdd2",
    textAlign: "center",
    lineHeight: 20,
  },
});
