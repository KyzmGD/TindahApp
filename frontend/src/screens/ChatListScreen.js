import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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

  const loadMatches = useCallback(async () => {
    const data = await getMatches();
    setMatches(data);
  }, []);

  useEffect(() => {
    loadMatches()
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [loadMatches]);

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
      <FlatList
        data={matches}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ff4458" />}
        contentContainerStyle={matches.length ? styles.list : styles.emptyList}
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
            <Pressable style={styles.row} onPress={() => navigation.navigate("Chat", { match: item, user: otherUser })}>
              <View style={styles.avatar}>
                {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} /> : <Image
  source={{
    uri: "https://i.pravatar.cc/300",
  }}
  style={styles.avatarImage}
/>}
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.name}>{otherUser?.name || "Match"}</Text>
                <Text style={styles.message} numberOfLines={1}>
                  {item.lastMessage?.text || "Start the conversation"}
                </Text>
              </View>
              <Text style={styles.chevron}>{">"}</Text>
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
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  title: {
    color: "#171a25",
    fontSize: 30,
    fontWeight: "900",
  },
  list: {
    paddingVertical: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ffedf0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
    color: "#171a25",
    fontSize: 17,
    fontWeight: "800",
  },
  message: {
    color: "#777b8d",
    fontSize: 14,
  },
  chevron: {
    color: "#b6b9c6",
    fontSize: 28,
  },
  empty: {
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#171a25",
    fontSize: 22,
    fontWeight: "900",
  },
  emptyText: {
    color: "#777b8d",
    textAlign: "center",
    lineHeight: 20,
  },
});
