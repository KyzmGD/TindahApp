import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import CardStack from "../components/swipe/CardStack";
import { discover, sendSwipe } from "../services/swipe.api";

export default function ExploreScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchBanner, setMatchBanner] = useState("");

  const loadProfiles = useCallback(async () => {
    const candidates = await discover();
    setUsers(candidates);
  }, []);

  useEffect(() => {
    loadProfiles()
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [loadProfiles]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadProfiles();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSwipe = async (user, direction) => {
    setUsers((current) => current.filter((item) => item._id !== user._id));
    const result = await sendSwipe(user._id, direction);

    if (result.isMatch) {
      const name = user.name || "someone";
      setMatchBanner(`You matched with ${name}`);
      setTimeout(() => setMatchBanner(""), 2500);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>tinder</Text>
        <Text style={styles.headerAction}>Filters</Text>
      </View>

      {matchBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{matchBanner}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ff4458" />}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#ff4458" size="large" />
          </View>
        ) : (
          <CardStack
            users={users}
            onNope={(user) => handleSwipe(user, "nope")}
            onLike={(user) => handleSwipe(user, "like")}
            onSuperLike={(user) => handleSwipe(user, "superlike")}
          />
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.nope]} onPress={() => users[0] && handleSwipe(users[0], "nope")}>
          <Text style={styles.nopeText}>X</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.superLike]}
          onPress={() => users[0] && handleSwipe(users[0], "superlike")}
        >
          <Text style={styles.superLikeText}>S</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.like]} onPress={() => users[0] && handleSwipe(users[0], "like")}>
          <Text style={styles.likeText}>H</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  logo: {
    color: "#ff4458",
    fontSize: 30,
    fontWeight: "900",
  },
  headerAction: {
    color: "#626678",
    fontWeight: "800",
  },
  content: {
    height: 560,
    padding: 16,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    position: "absolute",
    zIndex: 4,
    top: 112,
    left: 20,
    right: 20,
    borderRadius: 18,
    backgroundColor: "#202433",
    padding: 14,
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 16,
    backgroundColor: "#f7f8fc",
  },
  actionButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#1b1d28",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  nope: {
    borderWidth: 1,
    borderColor: "#ffd5dc",
  },
  superLike: {
    borderWidth: 1,
    borderColor: "#ccedff",
  },
  like: {
    borderWidth: 1,
    borderColor: "#cef4df",
  },
  nopeText: {
    color: "#ff4458",
    fontSize: 24,
    fontWeight: "900",
  },
  superLikeText: {
    color: "#2ba7ff",
    fontSize: 23,
    fontWeight: "900",
  },
  likeText: {
    color: "#20c970",
    fontSize: 24,
    fontWeight: "900",
  },
});
