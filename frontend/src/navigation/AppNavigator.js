import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  flushPendingNotificationNavigation,
  navigateFromNotificationData,
  navigationRef,
} from "./notificationNavigation";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ExploreScreen from "../screens/ExploreScreen";
import GamerLobbyScreen from "../screens/GamerLobbyScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import {
  addPushNotificationResponseListener,
  getLastPushNotificationResponseData,
} from "../services/pushNotifications";
import { getMatches } from "../services/swipe.api";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_META = {
  Explore: { label: "Explore", icon: "T" },
  GamerLobby: { label: "Gamer", icon: "G" },
  Matches: { label: "Matches", icon: "M" },
  Profile: { label: "Profile", icon: "P" },
};

const GAME_THEME = {
  Valorant: { label: "Valorant", icon: "V", color: "#ff4655" },
  PUBGMobile: { label: "PUBG Mobile", icon: "P", color: "#f5b342" },
  FreeFire: { label: "Free Fire", icon: "F", color: "#ff7a1a" },
  TFT: { label: "TFT", icon: "T", color: "#6dd6ff" },
  LienQuan: { label: "Lien Quan", icon: "L", color: "#8f7cff" },
};

function getUserId(user) {
  if (typeof user === "string") {
    return user;
  }

  return user?.id || user?._id || "";
}

function getAvatar(user) {
  return user?.avatarUrl || user?.photos?.[0]?.url || "https://i.pravatar.cc/300";
}

function getGameTheme(gameName) {
  return GAME_THEME[gameName] || GAME_THEME.Valorant;
}

function LoadingScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.loading, { backgroundColor: colors.screen }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function TindahTabBar({
  state,
  descriptors,
  navigation,
  hasUnreadMatches,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] || {
          label: options.tabBarLabel || options.title || route.name,
          icon: route.name.charAt(0),
        };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ hovered, pressed }) => [
              styles.tabItem,
              isFocused && {
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: colors.primary,
              },
              hovered && {
                backgroundColor: colors.accentSoft,
                borderWidth: 1,
                borderColor: colors.accent,
              },
              pressed && styles.tabItemPressed,
            ]}
          >
            {({ hovered }) => (
              <>
                <Text
                  style={[
                    styles.tabIcon,
                    { color: isFocused ? colors.primary : colors.dim },
                    hovered && { color: colors.text, transform: [{ scale: 1.08 }] },
                  ]}
                >
                  {meta.icon}
                </Text>
                {route.name === "Matches" && hasUnreadMatches ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>!</Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? colors.primary : colors.dim },
                    hovered && { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs({ hasUnreadMatches, onUnreadMatchesChange }) {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <TindahTabBar
          {...props}
          hasUnreadMatches={hasUnreadMatches}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="GamerLobby" component={GamerLobbyScreen} />
      <Tab.Screen name="Matches">
        {(props) => (
          <ChatListScreen
            {...props}
            onUnreadChange={onUnreadMatchesChange}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const { socket } = useSocket();
  const { mode, theme } = useTheme();
  const colors = theme.colors;
  const [teamFound, setTeamFound] = useState(null);
  const [teamDissolved, setTeamDissolved] = useState(null);
  const [hasUnreadMatches, setHasUnreadMatches] = useState(false);
  const refreshUnreadMatches = useCallback(async () => {
    if (!isAuthenticated) {
      setHasUnreadMatches(false);
      return;
    }

    try {
      const matches = await getMatches();
      setHasUnreadMatches(matches.some((match) => Number(match.unreadCount) > 0));
    } catch {
      setHasUnreadMatches(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let isMounted = true;

    getLastPushNotificationResponseData()
      .then((data) => {
        if (isMounted && data) {
          navigateFromNotificationData(data);
        }
      })
      .catch(() => {});

    const removeListener = addPushNotificationResponseListener(navigateFromNotificationData);

    return () => {
      isMounted = false;
      removeListener();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUnreadMatches();
  }, [refreshUnreadMatches]);

  useEffect(() => {
    if (!socket || !isAuthenticated) {
      return undefined;
    }

    const onTeamFound = (payload) => {
      setTeamFound(payload);
    };
    const onTeamDissolved = (payload) => {
      setTeamDissolved(payload);
    };
    const onMessageNotification = (message) => {
      const senderId = getUserId(message?.sender);

      if (senderId && senderId !== getUserId(user)) {
        setHasUnreadMatches(true);
      }
    };
    const onReadMessage = (payload) => {
      if (payload?.userId === getUserId(user)) {
        refreshUnreadMatches();
      }
    };

    socket.on("gamer_lobby:team_found", onTeamFound);
    socket.on("gamer_lobby:team_dissolved", onTeamDissolved);
    socket.on("message:notification", onMessageNotification);
    socket.on("read_message", onReadMessage);

    return () => {
      socket.off("gamer_lobby:team_found", onTeamFound);
      socket.off("gamer_lobby:team_dissolved", onTeamDissolved);
      socket.off("message:notification", onMessageNotification);
      socket.off("read_message", onReadMessage);
    };
  }, [isAuthenticated, refreshUnreadMatches, socket, user]);

  const openTeamChat = () => {
    const chatMatch = teamFound?.chatMatch;

    if (!chatMatch?._id) {
      setTeamFound(null);
      navigationRef.navigate("Main", { screen: "Matches" });
      return;
    }

    const otherUser = chatMatch.users?.find((item) => getUserId(item) !== getUserId(user));
    setTeamFound(null);
    setHasUnreadMatches(false);
    navigationRef.navigate("Chat", {
      match: chatMatch,
      user: otherUser,
    });
  };

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  const teamFoundGame = getGameTheme(teamFound?.recruitment?.gameName);
  const dissolvedGame = getGameTheme(teamDissolved?.recruitment?.gameName);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNotificationNavigation}
      theme={{
        dark: mode === "dark",
        colors: {
          primary: colors.primary,
          background: colors.screen,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main">
                {() => (
                  <MainTabs
                    hasUnreadMatches={hasUnreadMatches}
                    onUnreadMatchesChange={setHasUnreadMatches}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
        <Modal
          visible={Boolean(teamFound)}
          transparent
          animationType="fade"
          onRequestClose={() => setTeamFound(null)}
        >
          <View style={[styles.teamFoundOverlay, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.teamFoundCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: teamFoundGame.color,
                  shadowColor: teamFoundGame.color,
                },
              ]}
            >
              <View style={[styles.teamFoundIcon, { backgroundColor: teamFoundGame.color }]}>
                <Text style={styles.teamFoundIconText}>{teamFoundGame.icon}</Text>
              </View>
              <Text style={[styles.teamFoundTitle, { color: colors.text }]}>Teammate found</Text>
              <Text style={[styles.teamFoundSubtitle, { color: colors.muted }]}>
                {teamFoundGame.label} - Team {teamFound?.teamMatch?.teamSize} -{" "}
                {teamFound?.teamMatch?.playMode === "ranked" ? "Ranked" : "Casual"}
              </Text>
              <View style={styles.teamFoundUsers}>
                <View style={styles.teamFoundUser}>
                  <Image source={{ uri: getAvatar(teamFound?.teamMatch?.owner) }} style={styles.teamFoundAvatar} />
                  <Text style={[styles.teamFoundUserName, { color: colors.text }]} numberOfLines={1}>
                    {teamFound?.teamMatch?.owner?.name || "Captain"}
                  </Text>
                </View>
                <View style={[styles.teamFoundConnector, { backgroundColor: teamFoundGame.color }]} />
                <View style={styles.teamFoundUser}>
                  <Image source={{ uri: getAvatar(teamFound?.teamMatch?.joiner) }} style={styles.teamFoundAvatar} />
                  <Text style={[styles.teamFoundUserName, { color: colors.text }]} numberOfLines={1}>
                    {teamFound?.teamMatch?.joiner?.name || "Teammate"}
                  </Text>
                </View>
              </View>
              <View style={styles.teamFoundActions}>
                <Pressable
                  onPress={openTeamChat}
                  style={({ hovered, pressed }) => [
                    styles.teamFoundButton,
                    { backgroundColor: teamFoundGame.color },
                    hovered && styles.teamFoundButtonHover,
                    pressed && styles.tabItemPressed,
                  ]}
                >
                  <Text style={styles.teamFoundButtonText}>Go to chat</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTeamFound(null)}
                  style={({ hovered, pressed }) => [
                    styles.teamFoundSecondaryButton,
                    { backgroundColor: colors.elevated, borderColor: teamFoundGame.color },
                    hovered && styles.teamFoundButtonHover,
                    pressed && styles.tabItemPressed,
                  ]}
                >
                  <Text style={[styles.teamFoundSecondaryText, { color: teamFoundGame.color }]}>
                    Keep finding
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={Boolean(teamDissolved)}
          transparent
          animationType="fade"
          onRequestClose={() => setTeamDissolved(null)}
        >
          <View style={[styles.teamFoundOverlay, { backgroundColor: colors.overlay }]}>
            <View
              style={[
                styles.teamFoundCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: dissolvedGame.color,
                  shadowColor: dissolvedGame.color,
                },
              ]}
            >
              <View style={[styles.teamFoundIcon, { backgroundColor: dissolvedGame.color }]}>
                <Text style={styles.teamFoundIconText}>{dissolvedGame.icon}</Text>
              </View>
              <Text style={[styles.teamFoundTitle, { color: colors.text }]}>
                Đội bạn đã giải tán
              </Text>
              <Text style={[styles.teamFoundSubtitle, { color: colors.muted }]}>
                The recruiter stopped the {dissolvedGame.label} lobby.
              </Text>
              <View style={styles.teamFoundActions}>
                <Pressable
                  onPress={() => setTeamDissolved(null)}
                  style={({ hovered, pressed }) => [
                    styles.teamFoundButton,
                    { backgroundColor: dissolvedGame.color },
                    hovered && styles.teamFoundButtonHover,
                    pressed && styles.tabItemPressed,
                  ]}
                >
                  <Text style={styles.teamFoundButtonText}>Got it</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050506",
  },
  tabBar: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#2c2334",
    backgroundColor: "#121016",
    shadowColor: "#20c7ff",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: "rgba(255,79,123,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,79,123,0.28)",
  },
  tabItemHover: {
    backgroundColor: "rgba(32,199,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,199,255,0.34)",
    transform: [{ translateY: -2 }],
  },
  tabItemPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  tabLabel: {
    color: "#a79aaa",
    fontSize: 12,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#ff4f7b",
  },
  tabLabelHover: {
    color: "#ffffff",
  },
  tabIcon: {
    color: "#a79aaa",
    fontSize: 16,
    fontWeight: "900",
  },
  unreadBadge: {
    position: "absolute",
    top: 7,
    right: "31%",
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#ff5d72",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  tabIconActive: {
    color: "#ff4f7b",
  },
  tabIconHover: {
    color: "#ffffff",
    transform: [{ scale: 1.08 }],
  },
  teamFoundOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  teamFoundCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 16,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  teamFoundIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  teamFoundIconText: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
  },
  teamFoundTitle: {
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  teamFoundSubtitle: {
    marginTop: -8,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  teamFoundUsers: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  teamFoundUser: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamFoundAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  teamFoundUserName: {
    maxWidth: "100%",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  teamFoundConnector: {
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  teamFoundActions: {
    width: "100%",
    gap: 10,
  },
  teamFoundButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  teamFoundButtonHover: {
    transform: [{ translateY: -2 }, { scale: 1.01 }],
  },
  teamFoundButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  teamFoundSecondaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  teamFoundSecondaryText: {
    fontSize: 15,
    fontWeight: "900",
  },
});
