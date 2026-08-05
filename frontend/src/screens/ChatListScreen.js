import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getMatches } from "../services/swipe.api";
import ChatScreen from "./ChatScreen";

const NOTIFICATION_ICON = require("../../assets/figma-explore/notification.png");

function getUserId(user) {
  if (typeof user === "string") return user;
  return user?.id || user?._id || "";
}

function getOtherUser(match, currentUserId) {
  return match.users?.find((user) => getUserId(user) !== currentUserId) || match.users?.[0];
}

function isTeamMatch(match) {
  return match?.source === "gamer_lobby" && Boolean(match?.gamerContext?.recruitment);
}

function getConversationTitle(match, otherUser) {
  return isTeamMatch(match) ? match.gamerContext?.teamName || "Team chat" : otherUser?.name || "Match";
}

function getAvatar(user) {
  return user?.avatarUrl || user?.photos?.find((photo) => photo.isPrimary)?.url || user?.photos?.[0]?.url;
}

function formatRelativeTime(value) {
  if (!value) return "";
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60000) return "Now";
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m`;
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h`;
  return `${Math.floor(elapsed / 86400000)}d`;
}

function sortMatchesByActivity(matches) {
  return [...matches].sort((left, right) => {
    const leftTime = new Date(left.lastMessage?.sentAt || left.updatedAt || left.matchedAt || 0).getTime();
    const rightTime = new Date(right.lastMessage?.sentAt || right.updatedAt || right.matchedAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function getGamerLevel(user) {
  const signals = [
    Boolean(getAvatar(user)),
    Boolean(user?.name),
    Boolean(user?.bio),
    Boolean(user?.jobTitle || user?.school),
    (user?.interests || []).length >= 3,
    (user?.gamingProfiles || []).length > 0,
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 50);
}

export default function ChatListScreen({ navigation, route, onUnreadChange }) {
  const { user } = useAuth();
  const { isConnected, socket, subscribeToMatchPresence } = useSocket();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [matches, setMatches] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openedMatchId, setOpenedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const listAnimation = useRef(new Animated.Value(0)).current;
  const matchIdsKey = matches.map((match) => match._id).sort().join(",");
  const requestedMatchId = route?.params?.matchId;
  const requestedUserId = route?.params?.targetUserId;
  const openRequestId = route?.params?.openRequestId;

  const loadMatches = useCallback(async (preferredMatchId, preferredUserId) => {
    setLoadError("");
    const data = sortMatchesByActivity(await getMatches());
    const preferredMatch = data.find((match) => match._id === preferredMatchId)
      || (preferredUserId
        ? data.find((match) => !isTeamMatch(match) && match.users?.some((matchUser) => getUserId(matchUser) === preferredUserId))
        : null);
    setMatches(data);
    setSelectedId((current) => (
      preferredMatch
        ? preferredMatch._id
        : current && data.some((match) => match._id === current)
          ? current
          : data[0]?._id || null
    ));
    return data;
  }, []);

  useEffect(() => {
    loadMatches(requestedMatchId, requestedUserId)
      .then((data) => {
        const requestedMatch = data.find((match) => match._id === requestedMatchId)
          || data.find((match) => !isTeamMatch(match) && match.users?.some((matchUser) => getUserId(matchUser) === requestedUserId));
        if (isDesktop && requestedMatch && (requestedMatchId || requestedUserId)) {
          setOpenedMatchId(requestedMatch._id);
        }
        if (!isDesktop && (requestedMatchId || requestedUserId)) {
          if (requestedMatch) {
            navigation.navigate("Chat", {
              match: requestedMatch,
              user: getOtherUser(requestedMatch, user?.id),
            });
          }
        }
      })
      .catch((error) => {
        setMatches([]);
        setLoadError(error.message || "Could not load your matches.");
      })
      .finally(() => setLoading(false));
  }, [loadMatches, openRequestId, requestedMatchId, requestedUserId]);

  useEffect(() => {
    onUnreadChange?.(matches.some((match) => Number(match.unreadCount) > 0));
  }, [matches, onUnreadChange]);

  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    subscribeToMatchPresence(matches.map((match) => match._id));

    const updatePresence = ({ userId, isOnline, lastActive }) => {
      setMatches((current) => current.map((match) => ({
        ...match,
        users: match.users?.map((matchUser) => (
          getUserId(matchUser) === userId
            ? { ...matchUser, isOnline: Boolean(isOnline), lastActive }
            : matchUser
        )),
      })));
    };
    const onSnapshot = ({ users = [] }) => users.forEach(updatePresence);
    const onMessage = (message) => {
      setMatches((current) => sortMatchesByActivity(current.map((match) => {
        const messageMatchId = message.match?._id || message.match || message.matchId;
        if (match._id !== messageMatchId) return match;
        const senderId = getUserId(message.sender);
        const isDuplicate = match.lastMessage?.sentAt === message.createdAt
          && match.lastMessage?.text === (message.text || "Photo");
        const nextUnreadCount = isDesktop && isFocused && openedMatchId === match._id
          ? 0
          : senderId === user?.id || isDuplicate
            ? Number(match.unreadCount || 0)
            : Number(match.unreadCount || 0) + 1;
        return {
          ...match,
          lastMessage: { text: message.text || "Photo", sender: message.sender, sentAt: message.createdAt },
          unreadCount: nextUnreadCount,
        };
      })));
    };
    const onRead = ({ matchId, userId }) => {
      if (userId !== user?.id) return;
      setMatches((current) => current.map((match) => (
        match._id === matchId ? { ...match, unreadCount: 0 } : match
      )));
    };
    const onTeamMembership = ({ matchId, match }) => {
      if (!matchId || !match) return;
      setMatches((current) => current.map((item) => item._id === matchId ? match : item));
    };
    const onMatchesUpdated = () => {
      loadMatches().catch(() => {});
    };

    socket.on("presence:snapshot", onSnapshot);
    socket.on("presence:update", updatePresence);
    socket.on("receive_message", onMessage);
    socket.on("message:notification", onMessage);
    socket.on("read_message", onRead);
    socket.on("team:membership", onTeamMembership);
    socket.on("matches:updated", onMatchesUpdated);
    return () => {
      socket.off("presence:snapshot", onSnapshot);
      socket.off("presence:update", updatePresence);
      socket.off("receive_message", onMessage);
      socket.off("message:notification", onMessage);
      socket.off("read_message", onRead);
      socket.off("team:membership", onTeamMembership);
      socket.off("matches:updated", onMatchesUpdated);
    };
  }, [isConnected, isDesktop, isFocused, loadMatches, matchIdsKey, openedMatchId, socket, subscribeToMatchPresence, user?.id]);

  useEffect(() => {
    if (loading) return;
    listAnimation.setValue(0);
    Animated.timing(listAnimation, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [listAnimation, loading]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match._id === selectedId) || null,
    [matches, selectedId],
  );
  const selectedUser = selectedMatch ? getOtherUser(selectedMatch, user?.id) : null;

  const openMatch = (match, otherUser) => {
    setMatches((current) => current.map((item) => (
      item._id === match._id ? { ...item, unreadCount: 0 } : item
    )));
    if (isDesktop) {
      setSelectedId(match._id);
      setOpenedMatchId(match._id);
    }
    else navigation.navigate("Chat", { match, user: otherUser });
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadMatches();
    } catch (error) {
      setLoadError(error.message || "Could not refresh your matches.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#ff526b" size="large" /></View>;
  }

  return (
    <View style={styles.screen}>
      {isDesktop ? (
        <View style={styles.playerBar}>
          <Image source={NOTIFICATION_ICON} style={styles.notificationIcon} resizeMode="contain" />
          <View style={styles.playerDivider} />
          <View style={styles.playerCopy}>
            <Text style={styles.playerName}>Pro Player</Text>
            <Text style={styles.playerLevel}>Level {getGamerLevel(user)}</Text>
          </View>
          {getAvatar(user) ? <Image source={{ uri: getAvatar(user) }} style={styles.playerAvatar} /> : <View style={styles.playerAvatarFallback}><Text style={styles.playerAvatarText}>{user?.name?.[0] || "P"}</Text></View>}
        </View>
      ) : null}
      <View style={styles.workspace}>
        <View style={[styles.matchesPane, isDesktop && styles.matchesPaneDesktop]}>
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>MATCHES</Text>
            <Text style={styles.subtitle}>{matches.length} Active {matches.length === 1 ? "Lobby" : "Lobbies"}</Text>
          </View>
          <Animated.FlatList
            data={matches}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ff526b" />}
            contentContainerStyle={matches.length ? [styles.list, isDesktop && styles.listDesktop] : styles.emptyList}
            style={{ opacity: listAnimation }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{loadError ? "Unable to load matches" : "No matches yet"}</Text><Text style={styles.emptyText}>{loadError || "Keep exploring and your conversations will appear here."}</Text>{loadError ? <Pressable accessibilityRole="button" onPress={() => { setLoading(true); loadMatches().catch((error) => setLoadError(error.message || "Could not load your matches.")).finally(() => setLoading(false)); }} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable> : null}</View>}
            renderItem={({ item }) => {
              const otherUser = getOtherUser(item, user?.id);
              const teamChat = isTeamMatch(item);
              const avatarUser = teamChat ? item.users?.[0] || otherUser : otherUser;
              const avatarUrl = getAvatar(avatarUser);
              const conversationTitle = getConversationTitle(item, otherUser);
              const isSelected = isDesktop && item._id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation with ${conversationTitle}${Number(item.unreadCount) > 0 ? `, ${item.unreadCount} unread` : ""}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => openMatch(item, otherUser)}
                  style={({ hovered, pressed }) => [styles.row, isDesktop && styles.rowDesktop, isSelected && styles.rowSelected, hovered && styles.rowHover, pressed && styles.rowPressed]}
                >
                  <View style={[styles.avatarWrap, isDesktop && styles.avatarWrapDesktop]}>
                    {avatarUrl ? <Image source={{ uri: avatarUrl }} style={[styles.avatar, isDesktop && styles.avatarDesktop]} /> : <View style={[styles.avatarFallback, isDesktop && styles.avatarDesktop]}><Text style={styles.avatarText}>{conversationTitle?.[0] || "M"}</Text></View>}
                    <View style={[styles.presenceDot, teamChat ? styles.teamDot : otherUser?.isOnline ? styles.online : styles.offline]} />
                  </View>
                  <View style={styles.rowContent}>
                    <View style={styles.nameLine}>
                      <Text style={[styles.name, isDesktop && styles.nameDesktop]} numberOfLines={1}>{conversationTitle}</Text>
                      {!teamChat && otherUser?.isOnline ? <Text style={styles.activeLabel}>Now</Text> : null}
                    </View>
                    <Text style={[styles.message, Number(item.unreadCount) > 0 && styles.unreadMessage]} numberOfLines={isDesktop ? 2 : 1}>
                      {item.lastMessage?.text || "You matched — say hello!"}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.gameBadge}>{teamChat ? `${item.users?.length || 0}/${item.gamerContext?.teamSize || item.users?.length || 0} MEMBERS` : (otherUser?.gamingProfiles?.[0]?.gameName || "MATCH").toUpperCase()}</Text>
                      {(teamChat || !otherUser?.isOnline) ? <Text style={styles.time}>{formatRelativeTime(item.lastMessage?.sentAt || item.updatedAt)}</Text> : null}
                    </View>
                  </View>
                  {Number(item.unreadCount) > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View> : null}
                </Pressable>
              );
            }}
          />
        </View>
        {isDesktop ? (
          <View style={styles.chatPane}>
            {selectedMatch ? (
              <ChatScreen
                key={selectedMatch._id}
                embedded
                readReceiptsEnabled={openedMatchId === selectedMatch._id}
                navigation={navigation}
                route={{ params: { match: selectedMatch, user: selectedUser } }}
                onTeamLeft={(leftMatchId) => {
                  setMatches((current) => current.filter((match) => match._id !== leftMatchId));
                  setSelectedId(null);
                  setOpenedMatchId(null);
                }}
              />
            ) : (
              <View style={styles.emptyChat}><Text style={styles.emptyTitle}>Select a match</Text><Text style={styles.emptyText}>Choose a conversation from the list.</Text></View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1326" },
  workspace: { flex: 1, minHeight: 0, flexDirection: "row" },
  playerBar: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 31, gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", backgroundColor: "#0d1629" },
  notificationIcon: { width: 14, height: 14, tintColor: "#ffb4c0" },
  playerDivider: { width: 1, height: 25, backgroundColor: "#202c44", marginHorizontal: 8 },
  playerCopy: { alignItems: "flex-end" },
  playerName: { color: "#dce5ff", fontSize: 13, fontWeight: "800" },
  playerLevel: { color: "#8290ae", fontSize: 10, marginTop: 1 },
  playerAvatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#5b4967" },
  playerAvatarFallback: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#2b3650" },
  playerAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1326" },
  matchesPane: { flex: 1, backgroundColor: "#0e172b" },
  matchesPaneDesktop: { width: 300, minWidth: 300, maxWidth: 300, flex: 0, flexGrow: 0, flexShrink: 0, flexBasis: 300, backgroundColor: "#0d1629", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.035)" },
  header: { paddingTop: 42, paddingHorizontal: 32, paddingBottom: 20 },
  headerDesktop: { paddingTop: 34, paddingHorizontal: 30, paddingBottom: 18 },
  title: { color: "#dbe4ff", fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  titleDesktop: { fontSize: 34, letterSpacing: -1.4 },
  subtitle: { color: "#91a0c3", fontSize: 11, marginTop: 6 },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  listDesktop: { paddingLeft: 28, paddingRight: 0 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
  row: { minHeight: 88, padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 7 },
  rowDesktop: { minHeight: 84, paddingHorizontal: 10, paddingVertical: 10, gap: 9, marginBottom: 5 },
  rowSelected: { backgroundColor: "#151f36", borderColor: "rgba(255,82,107,0.28)", borderRightColor: "#ff526b" },
  rowHover: { backgroundColor: "#18233a", transform: [{ translateX: 2 }] },
  rowPressed: { opacity: 0.78 },
  avatarWrap: { width: 54, height: 54 },
  avatarWrapDesktop: { width: 43, height: 43 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarDesktop: { width: 43, height: 43, borderRadius: 22 },
  avatarFallback: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#283653", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 21, fontWeight: "900" },
  presenceDot: { position: "absolute", right: 1, bottom: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#151f36" },
  online: { backgroundColor: "#ff526b" },
  teamDot: { backgroundColor: "#8c6be8" },
  offline: { backgroundColor: "#66708b" },
  rowContent: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, color: "#dce5ff", fontSize: 15, fontWeight: "800" },
  nameDesktop: { fontSize: 13 },
  activeLabel: { color: "#ff526b", fontSize: 9, fontWeight: "800" },
  message: { color: "#93a0be", fontSize: 12 },
  unreadMessage: { color: "#dce5ff", fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  gameBadge: { color: "#9887d8", backgroundColor: "rgba(125,99,202,0.18)", fontSize: 8, fontWeight: "900", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, overflow: "hidden" },
  time: { color: "#66708b", fontSize: 9 },
  unreadBadge: { minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#ff526b", alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  chatPane: { flex: 1, minWidth: 0, backgroundColor: "#0d1629", paddingTop: 22, paddingRight: 32, paddingBottom: 20, paddingLeft: 14 },
  empty: { alignItems: "center", gap: 8 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { color: "#dce5ff", fontSize: 20, fontWeight: "800" },
  emptyText: { color: "#8996b5", textAlign: "center", lineHeight: 20 },
  retryButton: { marginTop: 10, minHeight: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  retryText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});
