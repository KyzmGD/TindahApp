import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  flushPendingNotificationNavigation,
  navigateFromNotificationData,
  navigationRef,
} from "./notificationNavigation";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import TeamFoundModal from "../components/common/TeamFoundModal";
import ExploreScreen from "../screens/ExploreScreen";
import GamerLobbyScreen from "../screens/GamerLobbyScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import {
  addPushNotificationResponseListener,
  getLastPushNotificationResponseData,
} from "../services/pushNotifications";
import { getLiveLobbyStats } from "../services/gamerLobby.api";
import { getMatches } from "../services/swipe.api";
import { useTheme } from "../theme/ThemeContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const STITCH_TINDAH_LOGO = require("../../assets/tindah_logo_stitch.png");
const DESKTOP_SIDEBAR_WIDTH = 288;
const FIGMA_NAV_ICONS = {
  Explore: require("../../assets/figma-explore/explore.png"),
  GamerLobby: require("../../assets/figma-explore/games.png"),
  Matches: require("../../assets/figma-explore/matches.png"),
  Profile: require("../../assets/figma-explore/profile.png"),
};
const FIGMA_LOBBY_ICONS = {
  gamers: require("../../assets/figma-explore/top-gamers.png"),
  parties: require("../../assets/figma-explore/active-parties.png"),
};

const TAB_META = {
  Explore: {
    label: "Explore",
    iconSource: FIGMA_NAV_ICONS.Explore,
    color: "#ff4f7b",
    soft: "rgba(255,79,123,0.18)",
    border: "rgba(255,79,123,0.5)",
  },
  GamerLobby: {
    label: "Games",
    iconSource: FIGMA_NAV_ICONS.GamerLobby,
    color: "#20c7ff",
    soft: "rgba(32,199,255,0.18)",
    border: "rgba(32,199,255,0.5)",
  },
  Matches: {
    label: "Matches",
    iconSource: FIGMA_NAV_ICONS.Matches,
    color: "#c27bff",
    soft: "rgba(194,123,255,0.18)",
    border: "rgba(194,123,255,0.48)",
  },
  Profile: {
    label: "Profile",
    iconSource: FIGMA_NAV_ICONS.Profile,
    color: "#34d399",
    soft: "rgba(52,211,153,0.16)",
    border: "rgba(52,211,153,0.44)",
  },
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

function getGameTheme(gameName) {
  return GAME_THEME[gameName] || GAME_THEME.Valorant;
}

function formatLiveCount(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
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
  isSidebar,
  liveLobbyStats,
}) {
  const { mode, theme } = useTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.tabBar,
        isSidebar && styles.sideTabBar,
        {
          backgroundColor: isSidebar ? "#131b2e" : "rgba(18,12,24,0.9)",
          borderTopColor: isSidebar ? "transparent" : "rgba(255,255,255,0.1)",
          borderRightColor: isSidebar ? "rgba(255,255,255,0.08)" : "transparent",
          shadowColor: mode === "dark" ? "#ff4f7b" : colors.shadow,
        },
      ]}
    >
      {isSidebar ? (
        <>
          <View style={styles.sideBrand}>
            <Image
              source={STITCH_TINDAH_LOGO}
              style={styles.sideBrandLogo}
              resizeMode="contain"
            />
            <Text style={styles.sideBrandName}>Tindah</Text>
          </View>
          <View style={styles.sideLobby}>
            <Text style={styles.sideLobbyTitle}>Live Lobby</Text>
            <View style={styles.sideLobbyItem}>
              <Image
                source={FIGMA_LOBBY_ICONS.gamers}
                style={styles.sideLobbyIcon}
                resizeMode="contain"
              />
              <View style={styles.sideLobbyCopy}>
                <Text style={styles.sideLobbyMain} numberOfLines={1}>Top Gamers</Text>
                <Text style={styles.sideLobbySub} numberOfLines={1}>
                  {formatLiveCount(liveLobbyStats?.onlineGamers)} online
                </Text>
              </View>
            </View>
            <View style={styles.sideLobbyItem}>
              <Image
                source={FIGMA_LOBBY_ICONS.parties}
                style={styles.sideLobbyIconWide}
                resizeMode="contain"
              />
              <View style={styles.sideLobbyCopy}>
                <Text style={styles.sideLobbyMain} numberOfLines={1}>Active Parties</Text>
                <Text style={styles.sideLobbySub} numberOfLines={1}>
                  {formatLiveCount(liveLobbyStats?.activeParties)} {Number(liveLobbyStats?.activeParties) === 1 ? "Post" : "Posts"}
                </Text>
              </View>
            </View>
          </View>
        </>
      ) : null}
      <View style={[styles.tabList, isSidebar && styles.sideTabList]}>
        {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] || {
          label: options.tabBarLabel || options.title || route.name,
          iconSource: FIGMA_NAV_ICONS.Explore,
          color: colors.primary,
          soft: colors.primarySoft,
          border: colors.primary,
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
              isSidebar && styles.sideTabItem,
              hovered && {
                backgroundColor: isSidebar ? "#222a3d" : "rgba(255,255,255,0.1)",
                borderWidth: isSidebar ? 0 : 1,
                borderColor: isSidebar ? "transparent" : "rgba(255,255,255,0.34)",
                transform: isSidebar ? [{ scale: 1 }] : [{ translateY: -1 }],
              },
              isFocused && {
                backgroundColor: isSidebar ? "#ff5167" : meta.soft,
                borderWidth: isSidebar ? 0 : 1,
                borderColor: isSidebar ? "transparent" : meta.border,
                shadowColor: meta.color,
                shadowOpacity: isSidebar ? 0 : 0.34,
              },
              hovered && isFocused && {
                backgroundColor: isSidebar ? "#ff7586" : meta.soft,
                borderColor: isSidebar ? "transparent" : "rgba(255,255,255,0.5)",
              },
              pressed && styles.tabItemPressed,
            ]}
          >
            {({ hovered }) => (
              <>
                <Image
                  source={meta.iconSource}
                  style={[
                    styles.tabIconImage,
                    isSidebar && styles.sideTabIconImage,
                    {
                      tintColor: isFocused
                        ? isSidebar
                          ? "#680019"
                          : meta.color
                        : isSidebar
                          ? "#e6bcbd"
                          : colors.dim,
                    },
                    hovered && {
                      tintColor: isFocused && isSidebar ? "#680019" : "#ffffff",
                      transform: [{ scale: 1.08 }],
                    },
                  ]}
                  resizeMode="contain"
                />
                {route.name === "Matches" && hasUnreadMatches ? (
                  <View style={[styles.unreadBadge, isSidebar && styles.sideUnreadBadge]}>
                    <Text style={styles.unreadBadgeText}>!</Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.tabLabel,
                    isSidebar && styles.sideTabLabel,
                    {
                      color: isFocused
                        ? isSidebar
                          ? "#680019"
                          : meta.color
                        : isSidebar
                          ? "#e6bcbd"
                          : colors.dim,
                    },
                    hovered && { color: isSidebar ? "#e6bcbd" : "rgba(255,255,255,0.92)" },
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>
                {!isSidebar ? (
                  <View
                    style={[
                      styles.tabIndicator,
                      {
                        backgroundColor: isFocused
                          ? meta.color
                          : hovered
                            ? "rgba(255,255,255,0.72)"
                            : "transparent",
                        shadowColor: isFocused ? meta.color : "rgba(255,255,255,0.72)",
                      },
                      isFocused && styles.tabIndicatorActive,
                      hovered && !isFocused && styles.tabIndicatorHover,
                    ]}
                  />
                ) : null}
              </>
            )}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

function MainTabs({
  activeMatchCount,
  hasUnreadMatches,
  liveLobbyStats,
  onMatchCreated,
  onUnreadMatchesChange,
}) {
  const { width } = useWindowDimensions();
  const isSidebar = width >= 900;

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <TindahTabBar
          {...props}
          hasUnreadMatches={hasUnreadMatches}
          isSidebar={isSidebar}
          liveLobbyStats={liveLobbyStats}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isSidebar ? "left" : "bottom",
        tabBarStyle: isSidebar
          ? {
              width: DESKTOP_SIDEBAR_WIDTH,
              minWidth: DESKTOP_SIDEBAR_WIDTH,
              maxWidth: DESKTOP_SIDEBAR_WIDTH,
            }
          : undefined,
        sceneStyle: isSidebar ? styles.sidebarScene : undefined,
      }}
    >
      <Tab.Screen name="Explore">
        {(props) => (
          <ExploreScreen
            {...props}
            activeMatchCount={activeMatchCount}
            liveLobbyStats={liveLobbyStats}
            onMatchCreated={onMatchCreated}
          />
        )}
      </Tab.Screen>
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
  const [liveLobbyStats, setLiveLobbyStats] = useState(null);
  const [activeMatchCount, setActiveMatchCount] = useState(null);
  const refreshUnreadMatches = useCallback(async () => {
    if (!isAuthenticated) {
      setHasUnreadMatches(false);
      setActiveMatchCount(null);
      return;
    }

    try {
      const matches = await getMatches();
      setHasUnreadMatches(matches.some((match) => Number(match.unreadCount) > 0));
      setActiveMatchCount(matches.length);
    } catch {
      setHasUnreadMatches(false);
      setActiveMatchCount(null);
    }
  }, [isAuthenticated]);
  const refreshLiveLobbyStats = useCallback(async () => {
    if (!isAuthenticated) {
      setLiveLobbyStats(null);
      return;
    }

    try {
      setLiveLobbyStats(await getLiveLobbyStats());
    } catch {
      // Keep the most recent real-time value during temporary network failures.
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
    refreshLiveLobbyStats();
  }, [refreshLiveLobbyStats]);

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
    const onLiveLobbyStats = (stats) => {
      setLiveLobbyStats(stats);
    };
    const onMatchesUpdated = () => {
      refreshUnreadMatches();
    };

    socket.on("gamer_lobby:team_found", onTeamFound);
    socket.on("gamer_lobby:team_dissolved", onTeamDissolved);
    socket.on("message:notification", onMessageNotification);
    socket.on("read_message", onReadMessage);
    socket.on("live_lobby:stats", onLiveLobbyStats);
    socket.on("matches:updated", onMatchesUpdated);

    return () => {
      socket.off("gamer_lobby:team_found", onTeamFound);
      socket.off("gamer_lobby:team_dissolved", onTeamDissolved);
      socket.off("message:notification", onMessageNotification);
      socket.off("read_message", onReadMessage);
      socket.off("live_lobby:stats", onLiveLobbyStats);
      socket.off("matches:updated", onMatchesUpdated);
    };
  }, [isAuthenticated, refreshUnreadMatches, socket, user]);

  const openTeamChat = () => {
    const chatMatch = teamFound?.chatMatch;

    if (!chatMatch?._id) {
      setTeamFound(null);
      navigationRef.navigate("Main", { screen: "Matches" });
      return;
    }

    setTeamFound(null);
    setHasUnreadMatches(false);
    navigationRef.navigate("Main", {
      screen: "Matches",
      params: {
        matchId: chatMatch._id,
        openRequestId: `team-${chatMatch._id}-${Date.now()}`,
      },
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
                    activeMatchCount={activeMatchCount}
                    hasUnreadMatches={hasUnreadMatches}
                    liveLobbyStats={liveLobbyStats}
                    onMatchCreated={refreshUnreadMatches}
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
        <TeamFoundModal
          visible={Boolean(teamFound)}
          result={teamFound}
          game={teamFoundGame}
          onClose={() => setTeamFound(null)}
          onOpenChat={openTeamChat}
        />
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
                Your team has been dissolved
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
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,12,24,0.88)",
    shadowColor: "#ff4f7b",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  sideTabBar: {
    width: DESKTOP_SIDEBAR_WIDTH,
    minWidth: DESKTOP_SIDEBAR_WIDTH,
    maxWidth: DESKTOP_SIDEBAR_WIDTH,
    height: "100%",
    minHeight: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: DESKTOP_SIDEBAR_WIDTH,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
    borderTopWidth: 0,
    borderRightWidth: 1,
    backgroundColor: "rgba(19,27,46,0.94)",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 0 },
  },
  sidebarScene: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#0b1326",
  },
  sideBrand: {
    height: 64,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(11,19,38,0.72)",
  },
  sideBrandLogo: {
    width: 32,
    height: 32,
    borderRadius: 5,
  },
  sideBrandName: {
    color: "#dae2fd",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
  },
  sideLobby: {
    flexShrink: 0,
    height: 212,
    paddingHorizontal: 32,
    paddingVertical: 32,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  sideLobbyTitle: {
    paddingHorizontal: 0,
    marginBottom: 10,
    color: "#e6bcbd",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sideLobbyItem: {
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: 6,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sideLobbyIcon: {
    width: 16,
    height: 20,
  },
  sideLobbyIconWide: {
    width: 24,
    height: 16,
    marginLeft: -4,
  },
  sideLobbyCopy: {
    flex: 1,
    minWidth: 0,
  },
  sideLobbyMain: {
    color: "#dae2fd",
    fontSize: 14,
    fontWeight: "700",
  },
  sideLobbySub: {
    color: "#ffb3b5",
    fontSize: 10,
    fontWeight: "500",
  },
  tabList: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 0,
  },
  sideTabList: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minHeight: 250,
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  sideTabItem: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 48,
    width: "100%",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tabItemPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  tabLabel: {
    color: "#a79aaa",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  sideTabLabel: {
    flex: 1,
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
  tabIconImage: {
    width: 18,
    height: 18,
  },
  sideTabIconImage: {
    width: 20,
    height: 20,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 2,
    width: 18,
    height: 2,
    borderRadius: 999,
  },
  tabIndicatorActive: {
    width: 26,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  tabIndicatorHover: {
    width: 20,
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
  sideUnreadBadge: {
    top: 14,
    right: 12,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
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
});
