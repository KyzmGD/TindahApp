import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CardStack from "../components/swipe/CardStack";
import { discover, sendSwipe } from "../services/swipe.api";
import MatchModal from "../components/common/MatchModal";
import { useNavigation } from "@react-navigation/native";

export default function ExploreScreen() {
  const [users, setUsers] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchBanner, setMatchBanner] = useState("");
  const [error, setError] = useState("");
  const pulse = useRef(new Animated.Value(0)).current;

  const loadProfiles = useCallback(async () => {
    setError("");
    const candidates = await discover();
    setUsers(candidates);
    setRemaining(candidates.length);
  }, []);
  const navigation = useNavigation();

const [showMatchModal, setShowMatchModal] =
  useState(false);

const [matchedUser, setMatchedUser] =
  useState(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

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
  const openChat = () => {
  setShowMatchModal(false);

  navigation.navigate(
    "ChatScreen",
    {
      matchId: matchedUser?._id,
      user: matchedUser,
    }
  );
  };
  const handleSwipe = async (user, direction) => {
  setUsers((current) => {
    const next = current.filter(
      (item) => item._id !== user._id
    );

    return next;
  });


  setRemaining((current) => Math.max(current - 1, 0));

  try {
    const result = await sendSwipe(user._id, direction);

    if (result.isMatch) {
  setMatchedUser(user);
  setShowMatchModal(true);
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
        <Pressable
          style={({ hovered, pressed }) => [
            styles.filterButton,
            hovered && styles.filterButtonHover,
            pressed && styles.buttonPressed,
          ]}
          onPress={refresh}
        >
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
        showsVerticalScrollIndicator={false}
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
            <Pressable
              style={({ hovered, pressed }) => [
                styles.retryButton,
                hovered && styles.retryButtonHover,
                pressed && styles.buttonPressed,
              ]}
              onPress={refresh}
            >
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
      <MatchModal
  visible={showMatchModal}
  currentUser={null}
  matchedUser={matchedUser}
  onClose={() => setShowMatchModal(false)}
  onMessage={openChat}
/>
      <View style={styles.actions}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.actionButton,
            styles.nope,
            hovered && styles.actionHover,
            pressed && styles.actionPressed,
          ]}
          onPress={() => users[0] && handleSwipe(users[0], "nope")}
        >
          <Text style={styles.nopeText}>X</Text>
        </Pressable>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.actionButton,
            styles.superLike,
            hovered && styles.actionHover,
            pressed && styles.actionPressed,
          ]}
          onPress={() => users[0] && handleSwipe(users[0], "superlike")}
        >
          <Animated.Text
            style={[
              styles.superLikeText,
              {
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.08],
                    }),
                  },
                ],
              },
            ]}
          >
            ★
          </Animated.Text>
        </Pressable>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.actionButton,
            styles.like,
            hovered && styles.actionHover,
            pressed && styles.actionPressed,
          ]}
          onPress={() => users[0] && handleSwipe(users[0], "like")}
        >
          <Animated.Text
            style={[
              styles.likeText,
              {
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              },
            ]}
          >
            ♥
          </Animated.Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  logo: {
    color: "#ff4458",
    fontSize: 30,
    fontWeight: "900",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#1d1a1a",
    borderRadius: 18,
  },
  filterButtonHover: {
    backgroundColor: "#282222",
    transform: [{ translateY: -1 }],
  },
  filterText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
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
    backgroundColor: "#1d1a1a",
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
    backgroundColor: "#000000",
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d1a1a",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionHover: {
    backgroundColor: "#282222",
    transform: [{ translateY: -2 }, { scale: 1.04 }],
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  nope: {
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  superLike: {
    borderWidth: 1,
    borderColor: "#2ba7ff",
  },
  like: {
    borderWidth: 1,
    borderColor: "#ff253a",
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ff4458",
  },
  retryButtonHover: {
    backgroundColor: "#ff5f70",
    transform: [{ translateY: -1 }],
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
  },
  nopeText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  superLikeText: {
    color: "#2ba7ff",
    fontSize: 30,
    fontWeight: "900",
  },
  likeText: {
    color: "#ff253a",
    fontSize: 32,
    fontWeight: "900",
  },
});
