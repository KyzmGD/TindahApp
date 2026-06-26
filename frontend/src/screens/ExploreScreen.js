import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CardStack from "../components/swipe/CardStack";
import { discover, sendSwipe } from "../services/swipe.api";

export default function ExploreScreen() {
  const [users, setUsers] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchBanner, setMatchBanner] = useState("");
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    setError("");
    const candidates = await discover();
    setUsers(candidates);
    setRemaining(candidates.length);
  }, []);

  useEffect(() => {
    loadProfiles()
      .catch(() => {
        setUsers([]);
        setRemaining(0);
        setError("Unable to load profiles. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [loadProfiles]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadProfiles();
    } catch {
      setError("Unable to refresh profiles. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSwipe = async (user, direction) => {
    setUsers((current) => current.filter((item) => item._id !== user._id));
    setRemaining((current) => Math.max(current - 1, 0));

    try {
      const result = await sendSwipe(user._id, direction);

      if (result.isMatch) {
        const name = user.name || "someone";
        setMatchBanner(`You matched with ${name}`);
        setTimeout(() => setMatchBanner(""), 2500);
      }
    } catch (swipeError) {
      setUsers((current) => [user, ...current]);
      setRemaining((current) => current + 1);
      setError(swipeError.message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>tindah</Text>
        <Pressable style={styles.filterButton} onPress={refresh}>
          <Text style={styles.filterText}>Filters</Text>
        </Pressable>
      </View>

      {matchBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{matchBanner}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#ff4458"
          />
        }
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#ff4458" size="large" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <CardStack
            users={users}
            remaining={remaining}
            onNope={(user) => handleSwipe(user, "nope")}
            onLike={(user) => handleSwipe(user, "like")}
            onSuperLike={(user) => handleSwipe(user, "superlike")}
          />
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.nope]}
          onPress={() => users[0] && handleSwipe(users[0], "nope")}
        >
          <Text style={styles.nopeText}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.superLike]}
          onPress={() => users[0] && handleSwipe(users[0], "superlike")}
        >
          <Text style={styles.superLikeText}>★</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.like]}
          onPress={() => users[0] && handleSwipe(users[0], "like")}
        >
          <Text style={styles.likeText}>♥</Text>
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
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#f4f5f8",
    borderRadius: 18,
  },
  filterText: {
    color: "#626678",
    fontWeight: "800",
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    position: "absolute",
    zIndex: 4,
    top: 120,
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
  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 420,
    paddingHorizontal: 20,
    gap: 12,
  },
  errorText: {
    color: "#ff4458",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 16,
    backgroundColor: "#f7f8fc",
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ff4458",
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
  },
  nopeText: {
    color: "#ff4458",
    fontSize: 28,
    fontWeight: "900",
  },
  superLikeText: {
    color: "#2ba7ff",
    fontSize: 28,
    fontWeight: "900",
  },
  likeText: {
    color: "#20c970",
    fontSize: 28,
  },
});
