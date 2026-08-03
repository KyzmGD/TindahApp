import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  closeGamerRecruitment,
  createGamerRecruitment,
  joinGamerRecruitment,
  listGamerRecruitments,
} from "../services/gamerLobby.api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../theme/ThemeContext";

const FALLBACK_AVATAR = "https://i.pravatar.cc/300";
const LOBBY_CODE_GAMES = ["Valorant", "FreeFire", "LienQuan"];

const GAME_CONFIGS = [
  {
    game: "Valorant",
    label: "Valorant",
    icon: "V",
    color: "#ff4655",
    lobbies: [
      { value: "group1", label: "Iron-Gold", detail: "Iron, Bronze, Silver, Gold", defaultRank: "Gold" },
      { value: "group2", label: "Plat-Asc", detail: "Platinum, Diamond, Ascendant", defaultRank: "Platinum" },
      { value: "group3", label: "Imm-Rad", detail: "Immortal, Radiant", defaultRank: "Radiant" },
    ],
  },
  {
    game: "PUBGMobile",
    label: "PUBG Mobile",
    icon: "P",
    color: "#f5b342",
    lobbies: [
      { value: "group1", label: "Bronze-Plat", detail: "Bronze, Silver, Gold, Platinum", defaultRank: "Platinum" },
      { value: "group2", label: "Diamond-Crown", detail: "Diamond, Crown", defaultRank: "Crown" },
      { value: "group3", label: "Ace+", detail: "Ace, Conqueror", defaultRank: "Ace" },
    ],
  },
  {
    game: "FreeFire",
    label: "Free Fire",
    icon: "F",
    color: "#ff7a1a",
    lobbies: [
      { value: "group1", label: "Plat-Diamond", detail: "Platinum, Diamond", defaultRank: "Diamond" },
      { value: "group2", label: "Heroic+", detail: "Heroic 1 star and above", defaultRank: "Heroic 1 star" },
    ],
  },
  {
    game: "TFT",
    label: "TFT",
    icon: "T",
    color: "#6dd6ff",
    lobbies: [
      { value: "group1", label: "Bronze-Gold", detail: "Bronze, Silver, Gold", defaultRank: "Gold" },
      { value: "group2", label: "Plat-Diamond", detail: "Platinum, Emerald, Diamond", defaultRank: "Emerald" },
      { value: "group3", label: "Master+", detail: "Master and above", defaultRank: "Master" },
    ],
  },
  {
    game: "LienQuan",
    label: "Lien Quan",
    icon: "L",
    color: "#8f7cff",
    lobbies: [
      { value: "group1", label: "Bronze-Gold", detail: "Bronze, Silver, Gold", defaultRank: "Gold" },
      { value: "group2", label: "Plat-Diamond", detail: "Platinum, Diamond", defaultRank: "Diamond" },
      { value: "group3", label: "Veteran+", detail: "Veteran, Master", defaultRank: "Veteran" },
    ],
  },
];

function getAvatar(user) {
  return user?.avatarUrl || user?.photos?.[0]?.url || FALLBACK_AVATAR;
}

function getUserId(user) {
  if (!user) {
    return "";
  }

  if (typeof user === "string") {
    return user;
  }

  return user.id || user._id || "";
}

function getRecruitmentId(post) {
  return post?.id || post?._id || "";
}

function getGameConfig(gameName) {
  return GAME_CONFIGS.find((config) => config.game === gameName) || GAME_CONFIGS[0];
}

function getLobbyCodeRule(gameName) {
  if (gameName === "Valorant") {
    return {
      required: true,
      maxLength: 6,
      keyboardType: "default",
      autoCapitalize: "characters",
      placeholder: "A1B2C3",
      helper: "Enter 6 letters or numbers for your Valorant lobby.",
      pattern: /^[A-Z0-9]{6}$/,
      error: "Valorant code must contain exactly 6 letters or numbers.",
    };
  }

  if (["FreeFire", "LienQuan"].includes(gameName)) {
    return {
      required: true,
      maxLength: 6,
      keyboardType: "number-pad",
      autoCapitalize: "none",
      placeholder: "123456",
      helper: `Enter the 6-digit ${getGameConfig(gameName).label} lobby code.`,
      pattern: /^\d{6}$/,
      error: `${getGameConfig(gameName).label} code must contain exactly 6 digits.`,
    };
  }

  return {
    required: false,
    maxLength: 6,
    keyboardType: "default",
    autoCapitalize: "characters",
    placeholder: "Optional",
    helper: "Lobby code is optional for this game.",
    pattern: /^[A-Z0-9]{0,6}$/,
    error: "Lobby code can contain up to 6 letters or numbers.",
  };
}

function normalizeLobbyCode(value, gameName) {
  const rawValue = String(value || "").toUpperCase();

  if (["FreeFire", "LienQuan"].includes(gameName)) {
    return rawValue.replace(/\D/g, "").slice(0, 6);
  }

  return rawValue.replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function maskInGameId(inGameID = "") {
  if (!inGameID) {
    return "Hidden until match";
  }

  if (inGameID.length <= 4) {
    return `${inGameID[0] || "*"}***`;
  }

  return `${inGameID.slice(0, 3)}***${inGameID.slice(-2)}`;
}

function GamerCard({ user, gameConfig, colors, index }) {
  const profile = user.gamingProfile || {};
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: gameConfig.color,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: getAvatar(user) }} style={styles.avatar} />
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: user.isOnline ? colors.success : colors.dim },
            ]}
          />
        </View>

        <View style={styles.identity}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user.name}
            {user.age ? <Text style={styles.age}> {user.age}</Text> : null}
          </Text>
          <Text style={[styles.distance, { color: colors.muted }]}>
            {user.distanceKm ? `${user.distanceKm} km away` : user.isOnline ? "Online now" : "Recently active"}
          </Text>
        </View>

        <View style={[styles.gameBadge, { borderColor: gameConfig.color }]}>
          <Text style={[styles.gameBadgeText, { color: gameConfig.color }]}>
            {gameConfig.label}
          </Text>
        </View>
      </View>

      <View style={[styles.rankPanel, { borderColor: gameConfig.color }]}>
        <View>
          <Text style={[styles.panelLabel, { color: colors.dim }]}>Current rank</Text>
          <Text style={[styles.rankText, { color: colors.text }]}>{profile.currentRank}</Text>
        </View>
        <View style={[styles.lobbyBadge, { backgroundColor: gameConfig.color }]}>
          <Text style={styles.lobbyBadgeText}>{profile.lobbyGroup?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={[styles.infoPill, { backgroundColor: colors.elevated }]}>
          <Text style={[styles.infoLabel, { color: colors.dim }]}>In-game ID</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{maskInGameId(profile.inGameID)}</Text>
        </View>
        <View style={[styles.infoPill, { backgroundColor: colors.elevated }]}>
          <Text style={[styles.infoLabel, { color: colors.dim }]}>Lobby skill</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{profile.lobbyGroup || "Unknown"}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function RecruitmentCard({ post, gameConfig, colors, index }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const owner = post.owner || {};
  const memberCount = post.memberCount || 1;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 280,
      delay: index * 35,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  return (
    <Animated.View
      style={[
        styles.recruitmentCard,
        {
          backgroundColor: colors.surface,
          borderColor: gameConfig.color,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.recruitmentTop}>
        <View style={styles.avatarWrapSmall}>
          <Image source={{ uri: getAvatar(owner) }} style={styles.avatarSmall} />
          <View
            style={[
              styles.onlineDotSmall,
              { backgroundColor: owner.isOnline ? colors.success : colors.dim },
            ]}
          />
        </View>
        <View style={styles.identity}>
          <Text style={[styles.recruitmentTitle, { color: colors.text }]} numberOfLines={1}>
            {owner.name || "Gamer"} is recruiting
          </Text>
          <Text style={[styles.distance, { color: colors.muted }]}>
            {owner.isOnline ? "Online now" : "Recently active"}
          </Text>
        </View>
        <View style={[styles.recruitmentMode, { backgroundColor: gameConfig.color }]}>
          <Text style={styles.recruitmentModeText}>
            {post.playMode === "ranked" ? "Ranked" : "Casual"}
          </Text>
        </View>
      </View>

      <View style={styles.recruitmentBody}>
        <View>
          <Text style={[styles.panelLabel, { color: colors.dim }]}>Lobby</Text>
          <Text style={[styles.rankText, { color: colors.text }]}>{post.currentRank}</Text>
        </View>
        <View style={[styles.teamBadge, { borderColor: gameConfig.color }]}>
          <Text style={[styles.teamBadgeText, { color: gameConfig.color }]}>
            {memberCount}/{post.teamSize}
          </Text>
        </View>
      </View>

      {post.description || post.note ? (
        <Text style={[styles.recruitmentNote, { color: colors.muted }]}>
          {post.description || post.note}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function SwipeRecruitmentCard({
  post,
  gameConfig,
  colors,
  currentUser,
  joiningRecruitmentId,
  closingRecruitmentId,
  onJoin,
  onClose,
  onCopyCode,
  onHide,
}) {
  const owner = post.owner || {};
  const modeLabel = post.playMode === "ranked" ? "Ranked" : "Casual";
  const memberCount = post.memberCount || 1;
  const isMine = getUserId(owner) === getUserId(currentUser);
  const isBusy = Boolean(joiningRecruitmentId || closingRecruitmentId);

  return (
    <Pressable
      style={({ hovered }) => [
        styles.swipeRecruitmentCard,
        {
          backgroundColor: colors.surface,
          borderColor: gameConfig.color,
          shadowColor: gameConfig.color,
        },
        hovered && styles.recruitmentCardHover,
      ]}
    >
      <View style={styles.swipeCardTop}>
        <View style={styles.posterIdentity}>
          <Image source={{ uri: getAvatar(owner) }} style={styles.posterAvatar} />
          <View style={styles.posterCopy}>
            <Text style={[styles.posterName, { color: colors.text }]} numberOfLines={1}>
              {owner.name || "Gamer"}
              {owner.age ? <Text style={styles.age}> {owner.age}</Text> : null}
            </Text>
            <Text style={[styles.posterMeta, { color: colors.muted }]}>
              posted a team recruitment
            </Text>
          </View>
        </View>
        <View style={[styles.swipeStatusBadge, { backgroundColor: colors.elevated }]}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: owner.isOnline ? colors.success : colors.dim },
            ]}
          />
          <Text style={[styles.liveText, { color: colors.muted }]}>
            {owner.isOnline ? "Online" : "Recent"}
          </Text>
        </View>
      </View>

      <View style={styles.swipeCardCenter}>
        <View style={[styles.swipeGameMark, { backgroundColor: gameConfig.color }]}>
          <Text style={styles.swipeGameMarkText}>{gameConfig.icon}</Text>
        </View>
        <View style={[styles.recruitingBadge, { backgroundColor: colors.elevated }]}>
          <View style={[styles.recruitingDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.recruitingText, { color: colors.success }]}>Đang chiêu mộ</Text>
        </View>
        <Text style={[styles.swipeName, { color: colors.text }]} numberOfLines={1}>
          {gameConfig.label} squad
        </Text>
        <Text style={[styles.swipeSubtitle, { color: colors.muted }]}>
          {modeLabel} - {memberCount}/{post.teamSize} players - {post.lobbyGroup?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.swipeInfoPanel}>
        <View style={styles.swipeInfoGrid}>
          <View style={[styles.swipeInfoTile, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.panelLabel, { color: colors.dim }]}>Game</Text>
            <Text style={[styles.swipeInfoValue, { color: colors.text }]}>{gameConfig.label}</Text>
          </View>
          <View style={[styles.swipeInfoTile, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.panelLabel, { color: colors.dim }]}>Rank</Text>
            <Text style={[styles.swipeInfoValue, { color: colors.text }]}>{post.currentRank}</Text>
          </View>
          <View style={[styles.swipeInfoTile, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.panelLabel, { color: colors.dim }]}>Team</Text>
            <Text style={[styles.swipeInfoValue, { color: colors.text }]}>
              {memberCount}/{post.teamSize}
            </Text>
          </View>
          <View style={[styles.swipeInfoTile, { backgroundColor: colors.elevated }]}>
            <Text style={[styles.panelLabel, { color: colors.dim }]}>Mode</Text>
            <Text style={[styles.swipeInfoValue, { color: colors.text }]}>{modeLabel}</Text>
          </View>
          {post.lobbyCode ? (
            <Pressable
              onPress={() => onCopyCode(post)}
              style={({ hovered, pressed }) => [
                styles.swipeInfoTile,
                styles.codeTile,
                { backgroundColor: colors.elevated, borderColor: hovered ? gameConfig.color : "transparent" },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.panelLabel, { color: colors.dim }]}>Lobby code</Text>
              <View style={styles.codeTileRow}>
                <Text style={[styles.swipeInfoValue, { color: gameConfig.color }]}>
                  {post.lobbyCode}
                </Text>
                <Text style={[styles.copyInlineText, { color: gameConfig.color }]}>Copy</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        <View
          style={[
            styles.swipeDescriptionBox,
            { backgroundColor: colors.elevated, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.panelLabel, { color: colors.dim }]}>Description</Text>
          <ScrollView
            style={styles.swipeDescriptionScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={[styles.swipeDescriptionText, { color: colors.text }]}>
              {post.description || post.note || "No description yet. Tap Join now! if this lobby fits your play style."}
            </Text>
          </ScrollView>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          onPress={() => onHide(post)}
          style={({ hovered, pressed }) => [
            styles.cardActionButton,
            styles.nopeButton,
            { backgroundColor: colors.elevated },
            hovered && styles.actionHover,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.nopeText}>Not today</Text>
        </Pressable>
        <Pressable
          onPress={() => onHide(post)}
          style={({ hovered, pressed }) => [
            styles.cardActionButton,
            styles.starButton,
            { backgroundColor: colors.elevated },
            hovered && styles.actionHover,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.starText}>See you soon</Text>
        </Pressable>
        <Pressable
          onPress={() => (isMine ? onClose(post) : onJoin(post))}
          disabled={isBusy}
          style={({ hovered, pressed }) => [
            styles.cardActionButton,
            isMine ? styles.stopButton : styles.joinButton,
            { backgroundColor: colors.elevated },
            hovered && styles.actionHover,
            pressed && styles.pressed,
            isBusy && styles.disabled,
          ]}
        >
          <Text style={isMine ? styles.stopText : styles.joinText}>
            {isMine
              ? closingRecruitmentId ? "Stopping..." : "Stop recruiting"
              : joiningRecruitmentId ? "Joining..." : "Join now!"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function GamerRecruitmentBoard({
  posts,
  gameConfig,
  colors,
  currentUser,
  joiningRecruitmentId,
  closingRecruitmentId,
  onJoin,
  onClose,
  onCopyCode,
  onHide,
}) {
  if (!posts.length) {
    return (
      <View
        style={[
          styles.swipeEmpty,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No recruitment posts</Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Open Recruit and post your own squad request for this lobby.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.recruitmentBoard}>
      {posts.map((post, index) => (
        <RecruitmentBoardItem
          key={getRecruitmentId(post)}
          post={post}
          index={index}
          gameConfig={gameConfig}
          colors={colors}
          currentUser={currentUser}
          joiningRecruitmentId={joiningRecruitmentId}
          closingRecruitmentId={closingRecruitmentId}
          onJoin={onJoin}
          onClose={onClose}
          onCopyCode={onCopyCode}
          onHide={onHide}
        />
      ))}
    </View>
  );
}

function RecruitmentBoardItem({ index, ...props }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      delay: index * 55,
      tension: 70,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  return (
    <Animated.View
      style={[
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <SwipeRecruitmentCard {...props} />
    </Animated.View>
  );
}

export default function GamerLobbyScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: screenWidth } = useWindowDimensions();
  const compactHeader = screenWidth < 430;
  const [selectedGame, setSelectedGame] = useState(GAME_CONFIGS[0].game);
  const selectedGameConfig = useMemo(
    () => GAME_CONFIGS.find((config) => config.game === selectedGame) || GAME_CONFIGS[0],
    [selectedGame],
  );
  const [selectedLobby, setSelectedLobby] = useState(selectedGameConfig.lobbies[0].value);
  const selectedLobbyConfig = useMemo(
    () =>
      selectedGameConfig.lobbies.find((lobby) => lobby.value === selectedLobby) ||
      selectedGameConfig.lobbies[0],
    [selectedGameConfig, selectedLobby],
  );
  const [recruitments, setRecruitments] = useState([]);
  const [teamSize, setTeamSize] = useState(4);
  const [playMode, setPlayMode] = useState("ranked");
  const [recruitmentLobbyCode, setRecruitmentLobbyCode] = useState("");
  const [recruitmentNote, setRecruitmentNote] = useState("");
  const [recruitmentError, setRecruitmentError] = useState("");
  const [recruitmentVisible, setRecruitmentVisible] = useState(false);
  const [teamFound, setTeamFound] = useState(null);
  const [joiningRecruitmentId, setJoiningRecruitmentId] = useState("");
  const [closingRecruitmentId, setClosingRecruitmentId] = useState("");
  const [posting, setPosting] = useState(false);
  const hiddenRecruitmentIdsRef = useRef(new Set());
  const selectedLobbyCodeRule = getLobbyCodeRule(selectedGameConfig.game);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadLobby = useCallback(async () => {
    setError("");
    const recruitmentData = await listGamerRecruitments({
      game: selectedGameConfig.game,
      lobbyGroup: selectedLobby,
      limit: 20,
    });
    setRecruitments(
      (recruitmentData.recruitments || []).filter(
        (post) => !hiddenRecruitmentIdsRef.current.has(getRecruitmentId(post)),
      ),
    );
  }, [selectedGameConfig.game, selectedLobby]);

  const handleSelectGame = (game) => {
    const nextConfig = GAME_CONFIGS.find((config) => config.game === game) || GAME_CONFIGS[0];
    setSelectedGame(game);
    setSelectedLobby(nextConfig.lobbies[0].value);
    setRecruitmentLobbyCode("");
  };

  useEffect(() => {
    setSelectedLobby(selectedGameConfig.lobbies[0].value);
  }, [selectedGameConfig]);

  useEffect(() => {
    setLoading(true);
    loadLobby()
      .catch((lobbyError) => {
        setRecruitments([]);
        setError(lobbyError.message || "Could not load gamer lobby.");
      })
      .finally(() => setLoading(false));
  }, [loadLobby]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onRecruitmentUpdated = (updatedPost) => {
      const postId = getRecruitmentId(updatedPost);

      if (
        !postId ||
        updatedPost.gameName !== selectedGameConfig.game ||
        updatedPost.lobbyGroup !== selectedLobby
      ) {
        return;
      }

      if (updatedPost.status === "closed") {
        hiddenRecruitmentIdsRef.current.add(postId);
        setRecruitments((current) => current.filter((item) => getRecruitmentId(item) !== postId));
        return;
      }

      setRecruitments((current) => {
        const existingIndex = current.findIndex((item) => getRecruitmentId(item) === postId);

        if (existingIndex === -1) {
          return current;
        }

        return current.map((item, index) => (index === existingIndex ? updatedPost : item));
      });
    };

    socket.on("gamer_lobby:recruitment_updated", onRecruitmentUpdated);

    return () => {
      socket.off("gamer_lobby:recruitment_updated", onRecruitmentUpdated);
    };
  }, [selectedGameConfig.game, selectedLobby, socket]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadLobby();
    } catch (lobbyError) {
      setError(lobbyError.message || "Could not refresh gamer lobby.");
    } finally {
      setRefreshing(false);
    }
  };

  const hideRecruitment = (post) => {
    const postId = getRecruitmentId(post);

    if (postId) {
      hiddenRecruitmentIdsRef.current.add(postId);
    }

    setRecruitments((current) => current.filter((item) => getRecruitmentId(item) !== postId));
  };

  const handleJoinRecruitment = async (post) => {
    const postId = getRecruitmentId(post);

    if (!postId || joiningRecruitmentId) {
      return;
    }

    if (getUserId(post.owner) === getUserId(currentUser)) {
      Alert.alert("This is your recruitment post", "Use Stop recruiting when you no longer need teammates.");
      return;
    }

    setJoiningRecruitmentId(postId);
    try {
      const data = await joinGamerRecruitment(postId);

      if (data.isTeamFound) {
        setTeamFound(data);
      }

      setRecruitments((current) => current.filter((item) => getRecruitmentId(item) !== postId));
      setError("");
    } catch (joinError) {
      const message = joinError.details
        ? Object.values(joinError.details).join(" ")
        : joinError.message || "Could not join this recruitment post.";

      Alert.alert("Could not join team", message);
    } finally {
      setJoiningRecruitmentId("");
    }
  };

  const handleCloseRecruitment = async (post) => {
    const postId = getRecruitmentId(post);

    if (!postId || closingRecruitmentId) {
      return;
    }

    setClosingRecruitmentId(postId);
    hiddenRecruitmentIdsRef.current.add(postId);
    setRecruitments((current) => current.filter((item) => getRecruitmentId(item) !== postId));
    try {
      await closeGamerRecruitment(postId);
      setError("");
    } catch (closeError) {
      hiddenRecruitmentIdsRef.current.delete(postId);
      setRecruitments((current) => [
        post,
        ...current.filter((item) => getRecruitmentId(item) !== postId),
      ]);
      Alert.alert(
        "Could not stop recruiting",
        closeError.message || "Please check your connection and try again.",
      );
    } finally {
      setClosingRecruitmentId("");
    }
  };

  const copyLobbyCode = async (post) => {
    const lobbyCode = post?.lobbyCode;

    if (!lobbyCode) {
      return;
    }

    try {
      if (Platform.OS === "web" && globalThis?.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(lobbyCode);
        Alert.alert("Lobby code copied", lobbyCode);
        return;
      }
    } catch {
      // Fall through to the readable alert for environments without clipboard access.
    }

    Alert.alert("Lobby code", lobbyCode);
  };

  const openTeamChat = () => {
    const chatMatch = teamFound?.chatMatch;
    if (!chatMatch?._id) {
      setTeamFound(null);
      navigation.navigate("Main", { screen: "Matches" });
      return;
    }

    const otherUser = chatMatch.users?.find((item) => getUserId(item) !== getUserId(currentUser));
    setTeamFound(null);
    const targetNavigation = navigation.getParent?.() || navigation;
    targetNavigation.navigate("Chat", {
      match: chatMatch,
      user: otherUser,
    });
  };

  const postRecruitment = async () => {
    if (posting) {
      return;
    }

    const normalizedLobbyCode = normalizeLobbyCode(recruitmentLobbyCode, selectedGameConfig.game);

    if (
      selectedLobbyCodeRule.required &&
      !selectedLobbyCodeRule.pattern.test(normalizedLobbyCode)
    ) {
      setRecruitmentError(selectedLobbyCodeRule.error);
      Alert.alert("Invalid lobby code", selectedLobbyCodeRule.error);
      return;
    }

    setPosting(true);
    setRecruitmentError("");
    try {
      const data = await createGamerRecruitment({
        gameName: selectedGameConfig.game,
        currentRank: selectedLobbyConfig.defaultRank,
        teamSize,
        playMode,
        lobbyCode: normalizedLobbyCode,
        description: recruitmentNote,
      });
      const createdRecruitment = data.recruitment;
      const createdRecruitmentId = getRecruitmentId(createdRecruitment);

      if (!createdRecruitmentId) {
        throw new Error("Server did not return the created recruitment post.");
      }

      setRecruitments((current) => [
        createdRecruitment,
        ...current.filter((post) => getRecruitmentId(post) !== createdRecruitmentId),
      ]);
      setRecruitmentNote("");
      setRecruitmentLobbyCode("");
      setRecruitmentVisible(false);
      setError("");
    } catch (postError) {
      const message = postError.details
        ? Object.values(postError.details).join(" ")
        : postError.message || "Please check your connection and try again.";
      setRecruitmentError(message);
      Alert.alert(
        "Could not post recruitment",
        message,
      );
    } finally {
      setPosting(false);
    }
  };

  const renderGameChip = (config) => {
    const selected = selectedGame === config.game;

    return (
      <Pressable
        key={config.game}
        onPress={() => handleSelectGame(config.game)}
        style={({ hovered, pressed }) => [
          styles.gameChip,
          compactHeader && styles.gameChipCompact,
          {
            backgroundColor: selected ? config.color : colors.elevated,
            borderColor: selected ? config.color : colors.border,
          },
          hovered && styles.gameChipHover,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.gameIcon, { color: selected ? "#ffffff" : config.color }]}>
          {config.icon}
        </Text>
        <Text style={[styles.gameLabel, { color: selected ? "#ffffff" : colors.text }]}>
          {config.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <View
        style={[
          styles.header,
          compactHeader && styles.headerCompact,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>Team up mode</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Gamer Lobby
          </Text>
        </View>
        <View style={[styles.headerActions, compactHeader && styles.headerActionsCompact]}>
          <Pressable
            onPress={refresh}
            disabled={refreshing || loading}
            style={({ hovered, pressed }) => [
              styles.headerRefreshButton,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.border,
              },
              hovered && {
                backgroundColor: colors.elevatedAlt,
                borderColor: colors.success,
                transform: [{ translateY: -1 }],
              },
              pressed && styles.pressed,
              (refreshing || loading) && styles.disabled,
            ]}
          >
            <Text style={[styles.headerRefreshText, { color: colors.success }]}>
              {refreshing || loading ? "..." : "Refresh"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRecruitmentVisible(true)}
            style={({ hovered, pressed }) => [
              styles.headerRecruitButton,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.border,
              },
              hovered && {
                backgroundColor: colors.elevatedAlt,
                borderColor: selectedGameConfig.color,
                transform: [{ translateY: -1 }],
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.headerRecruitText, { color: colors.text }]}>Find a team now!</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {compactHeader ? (
          <View style={styles.gameGridCompact}>
            {GAME_CONFIGS.map(renderGameChip)}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            alwaysBounceHorizontal
            contentContainerStyle={styles.gameStrip}
          >
            {GAME_CONFIGS.map(renderGameChip)}
          </ScrollView>
        )}

        <View style={styles.lobbySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lobby rank</Text>
          <View style={styles.lobbyGrid}>
            {selectedGameConfig.lobbies.map((lobby) => {
              const selected = selectedLobby === lobby.value;

              return (
                <Pressable
                  key={lobby.value}
                  onPress={() => setSelectedLobby(lobby.value)}
                  style={({ hovered, pressed }) => [
                    styles.lobbyOption,
                    {
                      backgroundColor: selected ? colors.primarySoft : colors.elevated,
                      borderColor: selected ? selectedGameConfig.color : colors.border,
                    },
                    hovered && {
                      borderColor: selectedGameConfig.color,
                      transform: [{ translateY: -2 }],
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.lobbyOptionTitle,
                      { color: selected ? selectedGameConfig.color : colors.text },
                    ]}
                  >
                    {lobby.label}
                  </Text>
                  <Text style={[styles.lobbyOptionDetail, { color: colors.muted }]} numberOfLines={2}>
                    {lobby.detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={selectedGameConfig.color} size="large" />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Finding teammates...</Text>
          </View>
        ) : error ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Lobby unavailable</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{error}</Text>
          </View>
        ) : (
          <GamerRecruitmentBoard
            posts={recruitments}
            gameConfig={selectedGameConfig}
            colors={colors}
            currentUser={currentUser}
            joiningRecruitmentId={joiningRecruitmentId}
            closingRecruitmentId={closingRecruitmentId}
            onJoin={handleJoinRecruitment}
            onClose={handleCloseRecruitment}
            onCopyCode={copyLobbyCode}
            onHide={hideRecruitment}
          />
        )}
      </ScrollView>
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
                borderColor: getGameConfig(teamFound?.recruitment?.gameName).color,
                shadowColor: getGameConfig(teamFound?.recruitment?.gameName).color,
              },
            ]}
          >
            <View
              style={[
                styles.teamFoundIcon,
                { backgroundColor: getGameConfig(teamFound?.recruitment?.gameName).color },
              ]}
            >
              <Text style={styles.teamFoundIconText}>
                {getGameConfig(teamFound?.recruitment?.gameName).icon}
              </Text>
            </View>
            <Text style={[styles.teamFoundTitle, { color: colors.text }]}>Teammate found</Text>
            <Text style={[styles.teamFoundSubtitle, { color: colors.muted }]}>
              {getGameConfig(teamFound?.recruitment?.gameName).label} - Team{" "}
              {teamFound?.teamMatch?.teamSize} -{" "}
              {teamFound?.teamMatch?.playMode === "ranked" ? "Ranked" : "Casual"}
            </Text>

            <View style={styles.teamFoundUsers}>
              <View style={styles.teamFoundUser}>
                <Image
                  source={{ uri: getAvatar(teamFound?.teamMatch?.owner) }}
                  style={styles.teamFoundAvatar}
                />
                <Text style={[styles.teamFoundUserName, { color: colors.text }]} numberOfLines={1}>
                  {teamFound?.teamMatch?.owner?.name || "Captain"}
                </Text>
              </View>
              <View
                style={[
                  styles.teamFoundConnector,
                  { backgroundColor: getGameConfig(teamFound?.recruitment?.gameName).color },
                ]}
              />
              <View style={styles.teamFoundUser}>
                <Image
                  source={{ uri: getAvatar(teamFound?.teamMatch?.joiner) }}
                  style={styles.teamFoundAvatar}
                />
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
                  { backgroundColor: getGameConfig(teamFound?.recruitment?.gameName).color },
                  hovered && styles.recruitButtonHover,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.teamFoundButtonText}>Go to chat</Text>
              </Pressable>
              <Pressable
                onPress={() => setTeamFound(null)}
                style={({ hovered, pressed }) => [
                  styles.teamFoundSecondaryButton,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: getGameConfig(teamFound?.recruitment?.gameName).color,
                  },
                  hovered && styles.actionHover,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.teamFoundSecondaryText,
                    { color: getGameConfig(teamFound?.recruitment?.gameName).color },
                  ]}
                >
                  Keep finding
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={recruitmentVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecruitmentVisible(false)}
      >
        <View style={[styles.filtersOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.filtersBackdrop} onPress={() => setRecruitmentVisible(false)} />
          <View
            style={[
              styles.filtersSheet,
              {
                backgroundColor: colors.screen,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.borderStrong }]} />
            <View
              style={[
                styles.filtersHeader,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.headerSide} />
              <Text style={[styles.filtersTitle, { color: colors.text }]}>Recruitment</Text>
              <Pressable
                disabled={posting}
                onPress={postRecruitment}
                style={({ hovered, pressed }) => [
                  styles.doneButton,
                  hovered && styles.doneButtonTextHoverArea,
                  pressed && styles.pressed,
                ]}
              >
                {({ hovered }) =>
                  posting ? (
                    <ActivityIndicator color={colors.success} />
                  ) : (
                    <Text
                      style={[
                        styles.doneText,
                        { color: hovered ? colors.success : colors.accent },
                        hovered && styles.doneTextHover,
                      ]}
                    >
                      Post
                    </Text>
                  )
                }
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Game</Text>
              <View style={styles.sheetGameGrid}>
                {GAME_CONFIGS.map((config) => {
                  const selected = selectedGame === config.game;

                  return (
                    <Pressable
                      key={config.game}
                      onPress={() => handleSelectGame(config.game)}
                      style={({ hovered, pressed }) => [
                        styles.sheetGameChip,
                        {
                          backgroundColor: selected ? config.color : colors.elevated,
                          borderColor: selected ? config.color : colors.border,
                        },
                        hovered && { borderColor: config.color, transform: [{ translateY: -2 }] },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.gameIcon, { color: selected ? "#ffffff" : config.color }]}>
                        {config.icon}
                      </Text>
                      <Text style={[styles.gameLabel, { color: selected ? "#ffffff" : colors.text }]}>
                        {config.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Rank lobby</Text>
              <View style={styles.lobbyGrid}>
                {selectedGameConfig.lobbies.map((lobby) => {
                  const selected = selectedLobby === lobby.value;

                  return (
                    <Pressable
                      key={lobby.value}
                      onPress={() => setSelectedLobby(lobby.value)}
                      style={({ hovered, pressed }) => [
                        styles.lobbyOption,
                        {
                          backgroundColor: selected ? colors.primarySoft : colors.elevated,
                          borderColor: selected ? selectedGameConfig.color : colors.border,
                        },
                        hovered && {
                          borderColor: selectedGameConfig.color,
                          transform: [{ translateY: -2 }],
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.lobbyOptionTitle,
                          { color: selected ? selectedGameConfig.color : colors.text },
                        ]}
                      >
                        {lobby.label}
                      </Text>
                      <Text style={[styles.lobbyOptionDetail, { color: colors.muted }]} numberOfLines={2}>
                        {lobby.detail}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Team size</Text>
              <View style={styles.recruitControls}>
                {[2, 4].map((size) => {
                  const selected = teamSize === size;

                  return (
                    <Pressable
                      key={size}
                      onPress={() => setTeamSize(size)}
                      style={({ hovered, pressed }) => [
                        styles.recruitChip,
                        {
                          backgroundColor: selected ? selectedGameConfig.color : colors.elevated,
                          borderColor: selected ? selectedGameConfig.color : colors.border,
                        },
                        hovered && { borderColor: selectedGameConfig.color },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.recruitChipText, { color: selected ? "#ffffff" : colors.text }]}>
                        Team {size}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Mode</Text>
              <View style={styles.recruitControls}>
                {["ranked", "casual"].map((mode) => {
                  const selected = playMode === mode;

                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setPlayMode(mode)}
                      style={({ hovered, pressed }) => [
                        styles.recruitChip,
                        {
                          backgroundColor: selected ? colors.primarySoft : colors.elevated,
                          borderColor: selected ? selectedGameConfig.color : colors.border,
                        },
                        hovered && { borderColor: selectedGameConfig.color },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.recruitChipText,
                          { color: selected ? selectedGameConfig.color : colors.text },
                        ]}
                      >
                        {mode === "ranked" ? "Ranked" : "Casual"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {LOBBY_CODE_GAMES.includes(selectedGameConfig.game) ? (
                <>
                  <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Lobby code</Text>
                  <View style={styles.codeInputGroup}>
                    <TextInput
                      value={recruitmentLobbyCode}
                      onChangeText={(value) => {
                        setRecruitmentLobbyCode(
                          normalizeLobbyCode(value, selectedGameConfig.game),
                        );
                      }}
                      maxLength={selectedLobbyCodeRule.maxLength}
                      placeholder={selectedLobbyCodeRule.placeholder}
                      placeholderTextColor={colors.dim}
                      keyboardType={selectedLobbyCodeRule.keyboardType}
                      autoCapitalize={selectedLobbyCodeRule.autoCapitalize}
                      style={[
                        styles.codeInput,
                        {
                          backgroundColor: colors.elevated,
                          borderColor: selectedGameConfig.color,
                          color: colors.text,
                        },
                      ]}
                    />
                    <Text style={[styles.codeHint, { color: colors.muted }]}>
                      {selectedLobbyCodeRule.helper}
                    </Text>
                  </View>
                </>
              ) : null}

              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Description</Text>
              <TextInput
                value={recruitmentNote}
                onChangeText={setRecruitmentNote}
                multiline
                maxLength={300}
                placeholder="Tell teammates your goal, role, voice chat, or play time..."
                placeholderTextColor={colors.dim}
                style={[
                  styles.recruitDescriptionInput,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                textAlignVertical="top"
              />
              <Text style={[styles.descriptionCounter, { color: colors.muted }]}>
                {recruitmentNote.length}/300
              </Text>
              {recruitmentError ? (
                <Text style={[styles.recruitmentError, { color: colors.danger }]}>
                  {recruitmentError}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
    paddingHorizontal: 18,
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  livePill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "900",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 1,
  },
  headerActionsCompact: {
    width: "100%",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerRefreshButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRefreshText: {
    fontSize: 12,
    fontWeight: "900",
  },
  headerRecruitButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    maxWidth: 178,
  },
  headerRecruitText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 18,
  },
  gameStrip: {
    gap: 10,
    paddingRight: 42,
  },
  gameGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gameChip: {
    width: 112,
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 3,
  },
  gameChipCompact: {
    flexGrow: 1,
    flexBasis: "31%",
    minWidth: 96,
    maxWidth: "48%",
    minHeight: 58,
    paddingHorizontal: 12,
  },
  gameChipHover: {
    transform: [{ translateY: -2 }, { scale: 1.02 }],
  },
  gameIcon: {
    fontSize: 19,
    fontWeight: "900",
  },
  gameLabel: {
    fontSize: 13,
    fontWeight: "900",
  },
  sheetGameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sheetGameChip: {
    flexGrow: 1,
    flexBasis: "44%",
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
    gap: 3,
  },
  lobbySection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  lobbyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lobbyOption: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 128,
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    justifyContent: "center",
    gap: 4,
  },
  lobbyOptionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  lobbyOptionDetail: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  recruitBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 14,
  },
  recruitHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  recruitHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  recruitControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recruitChip: {
    minHeight: 42,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recruitChipText: {
    fontSize: 13,
    fontWeight: "900",
  },
  recruitDescriptionInput: {
    minHeight: 112,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  codeInputGroup: {
    gap: 8,
  },
  codeInput: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  descriptionCounter: {
    marginTop: -12,
    alignSelf: "flex-end",
    fontSize: 12,
    fontWeight: "800",
  },
  recruitmentError: {
    marginTop: -8,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  recruitButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  recruitButtonHover: {
    transform: [{ translateY: -2 }, { scale: 1.01 }],
  },
  recruitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  recruitmentFeed: {
    gap: 12,
  },
  recruitmentCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 13,
  },
  recruitmentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrapSmall: {
    width: 46,
    height: 46,
  },
  avatarSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  onlineDotSmall: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#050506",
  },
  recruitmentTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  recruitmentMode: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  recruitmentModeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  recruitmentBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  teamBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  recruitmentNote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  filtersOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  filtersBackdrop: {
    flex: 1,
  },
  filtersSheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 58,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 2,
  },
  filtersHeader: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  headerSide: {
    width: 72,
  },
  filtersTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  doneButton: {
    width: 72,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  doneButtonTextHoverArea: {
    transform: [{ translateY: -1 }],
  },
  doneText: {
    fontSize: 18,
    fontWeight: "700",
  },
  doneTextHover: {
    transform: [{ scale: 1.08 }],
  },
  filtersContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 34,
    gap: 18,
  },
  filtersSectionTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  loading: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontWeight: "800",
  },
  cardList: {
    gap: 14,
  },
  recruitmentBoard: {
    gap: 18,
  },
  swipeRecruitmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
    gap: 20,
  },
  recruitmentCardHover: {
    transform: [{ translateY: -3 }, { scale: 1.005 }],
    shadowOpacity: 0.28,
  },
  swipeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  posterIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  posterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  posterCopy: {
    flex: 1,
    gap: 2,
  },
  posterName: {
    fontSize: 17,
    fontWeight: "900",
  },
  posterMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  swipeGameMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeGameMarkText: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
  },
  swipeStatusBadge: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  swipeCardCenter: {
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  recruitingBadge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  recruitingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  recruitingText: {
    fontSize: 12,
    fontWeight: "900",
  },
  swipeName: {
    maxWidth: "92%",
    fontSize: 31,
    fontWeight: "900",
    textAlign: "center",
  },
  swipeSubtitle: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  swipeInfoPanel: {
    gap: 12,
    marginTop: 4,
  },
  swipeInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swipeInfoTile: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 68,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: "center",
  },
  codeTile: {
    borderWidth: 1,
  },
  codeTileRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copyInlineText: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  swipeInfoValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "900",
  },
  swipeDescriptionBox: {
    minHeight: 98,
    maxHeight: 160,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  swipeDescriptionScroll: {
    maxHeight: 105,
  },
  swipeDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  swipeEmpty: {
    minHeight: 260,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingTop: 2,
  },
  cardActionButton: {
    minWidth: 104,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionHover: {
    transform: [{ translateY: -2 }, { scale: 1.03 }],
  },
  nopeButton: {
    borderColor: "#ffffff",
  },
  starButton: {
    borderColor: "#20c7ff",
  },
  joinButton: {
    borderColor: "#23d49b",
  },
  stopButton: {
    borderColor: "#ff5d72",
  },
  nopeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  starText: {
    color: "#20c7ff",
    fontSize: 13,
    fontWeight: "900",
  },
  joinText: {
    color: "#23d49b",
    fontSize: 13,
    fontWeight: "900",
  },
  stopText: {
    color: "#ff5d72",
    fontSize: 13,
    fontWeight: "900",
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
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 14,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 58,
    height: 58,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#050506",
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 19,
    fontWeight: "900",
  },
  age: {
    fontWeight: "500",
  },
  distance: {
    fontSize: 13,
    fontWeight: "700",
  },
  gameBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gameBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  rankPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rankText: {
    fontSize: 22,
    fontWeight: "900",
  },
  lobbyBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lobbyBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoPill: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  empty: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

