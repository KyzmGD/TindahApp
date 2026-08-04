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
import { LinearGradient } from "expo-linear-gradient";
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
const RANK_PREVIEW_IMAGES = {
  Valorant: require("../../assets/games/aboutrankvalorant.jpg"),
  PUBGMobile: require("../../assets/games/rankpubg.png"),
  FreeFire: require("../../assets/games/ranksfreefire.jpg"),
  TFT: require("../../assets/games/tftranks.webp"),
  LienQuan: require("../../assets/games/lienquanranks.jpg"),
};
const VALORANT_FIGMA_ASSETS = {
  refresh: require("../../assets/figma-games/valorant/refreshicon.png"),
  add: require("../../assets/figma-games/valorant/iconadd.png"),
  search: require("../../assets/figma-games/valorant/IconSearch.png"),
  backgroundPost: require("../../assets/figma-games/valorant/backgroundpost.png"),
  recruitmentForm: require("../../assets/figma-games/valorant/backgroundformrecruit.png"),
  recruitmentGame: require("../../assets/figma-games/valorant/iconvalorantrecruit.png"),
  gameLobby: require("../../assets/figma-games/valorant/icongamelobby.png"),
  plus: require("../../assets/figma-games/valorant/iconplus.png"),
  pen: require("../../assets/figma-games/valorant/iconpen.png"),
  code: require("../../assets/figma-games/valorant/icondauthang.png"),
  post: require("../../assets/figma-games/valorant/iconpost.png"),
  games: {
    Valorant: require("../../assets/figma-games/valorant/iconvalo.png"),
    PUBGMobile: require("../../assets/figma-games/valorant/iconpubg.png"),
    FreeFire: require("../../assets/figma-games/valorant/iconff.png"),
    TFT: require("../../assets/figma-games/valorant/icontft.png"),
    LienQuan: require("../../assets/figma-games/valorant/iconlquan.png"),
  },
  ranks: {
    group1: require("../../assets/figma-games/valorant/iconbua.png"),
    group2: require("../../assets/figma-games/valorant/iconplatasc.png"),
    group3: require("../../assets/figma-games/valorant/iconimtrad.png"),
  },
};

const GAME_CONFIGS = [
  {
    game: "Valorant",
    label: "Valorant",
    icon: "V",
    logo: require("../../assets/games/logovalorant.jpg"),
    color: "#ff5a66",
    lobbies: [
      { value: "group1", label: "Iron - Gold", detail: "Casual & Learners", defaultRank: "Gold" },
      { value: "group2", label: "Plat - Asc", detail: "Mid-High Tier", defaultRank: "Platinum" },
      { value: "group3", label: "Imm - Rad", detail: "Elite Tier", defaultRank: "Radiant" },
    ],
  },
  {
    game: "PUBGMobile",
    label: "PUBG Mobile",
    icon: "P",
    logo: require("../../assets/games/logopubg.webp"),
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
    logo: require("../../assets/games/logofreefire.jpg"),
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
    logo: require("../../assets/games/logotft.jpg"),
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
    logo: require("../../assets/games/logolienquan.jpg"),
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
  const teamName = String(post.teamName || "").trim() || `${gameConfig.label} squad`;

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
            {teamName}
          </Text>
          <Text style={[styles.distance, { color: colors.muted }]}>
            Posted by {owner.name || "Gamer"} - {owner.isOnline ? "Online now" : "Recently active"}
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
  const teamName = String(post.teamName || "").trim() || `${gameConfig.label} squad`;

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
      {gameConfig.game === "Valorant" ? (
        <Image
          source={VALORANT_FIGMA_ASSETS.backgroundPost}
          style={styles.postBackgroundImage}
          resizeMode="cover"
          pointerEvents="none"
        />
      ) : null}
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
          <Text style={[styles.recruitingText, { color: colors.success }]}>Recruiting now</Text>
        </View>
        <Text style={[styles.swipeName, { color: colors.text }]} numberOfLines={1}>
          {teamName}
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
  onOpenRecruit,
}) {
  if (!posts.length) {
    return (
      <Pressable
        style={({ hovered }) => [
          styles.valorantEmptyState,
          {
            backgroundColor: "rgba(4,12,31,0.88)",
            borderColor: hovered ? "rgba(255,179,181,0.58)" : "rgba(93,63,64,0.42)",
            shadowColor: "#FFB3B5",
          },
          hovered && styles.floatingPanelHover,
        ]}
      >
        {gameConfig.game === "Valorant" ? (
          <Image
            source={VALORANT_FIGMA_ASSETS.backgroundPost}
            style={styles.postBackgroundImage}
            resizeMode="cover"
            pointerEvents="none"
          />
        ) : null}
        <View style={styles.emptySearchTarget}>
          <View style={styles.emptySearchSquare}>
            <Image source={VALORANT_FIGMA_ASSETS.search} style={styles.emptySearchIcon} resizeMode="contain" />
          </View>
        </View>
        <Text style={[styles.valorantEmptyTitle, { color: colors.text }]}>No Recruitment Posts Yet</Text>
        <Text style={styles.valorantEmptyDescription}>
          The lobby is quiet. Be the first to assemble a squad.{"\n"}
          Open Recruit and post your request to find{"\n"}
          teammates matching your vibe and rank.
        </Text>
        <Pressable
          onPress={onOpenRecruit}
          style={({ hovered, pressed }) => [
            styles.openRecruitButton,
            hovered && styles.openRecruitButtonHover,
            pressed && styles.pressed,
          ]}
        >
          <Image source={VALORANT_FIGMA_ASSETS.add} style={styles.openRecruitIcon} resizeMode="contain" />
          <Text style={styles.openRecruitButtonText}>Open Recruit Post</Text>
        </Pressable>
      </Pressable>
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
  const baseColors = theme.colors;
  const { width: screenWidth } = useWindowDimensions();
  const compactHeader = screenWidth < 720;
  const wideLobbyLayout = screenWidth >= 940;
  const [selectedGame, setSelectedGame] = useState(GAME_CONFIGS[0].game);
  const selectedGameConfig = useMemo(
    () => GAME_CONFIGS.find((config) => config.game === selectedGame) || GAME_CONFIGS[0],
    [selectedGame],
  );
  const activeRankPreview = RANK_PREVIEW_IMAGES[selectedGameConfig.game];
  const colors = useMemo(() => {
    if (selectedGameConfig.game === "Valorant") {
      return {
        ...baseColors,
        screen: "#0B1326",
        surface: "rgba(9,15,28,0.78)",
        elevated: "rgba(15,23,42,0.82)",
        elevatedAlt: "rgba(28,38,64,0.9)",
        border: "rgba(45,212,191,0.24)",
        borderStrong: "rgba(255,90,102,0.5)",
        text: "#f9fafb",
        muted: "#d9e2e2",
        dim: "#9fb3bb",
        primary: "#ff5a66",
        primaryStrong: "#ff3347",
        primarySoft: "rgba(255,90,102,0.18)",
        accent: "#2dd4bf",
        accentSoft: "rgba(45,212,191,0.16)",
        success: "#2dd4bf",
        danger: "#ff5a66",
        overlay: "rgba(4,8,18,0.72)",
        shadow: "#2dd4bf",
      };
    }

    if (selectedGameConfig.game === "PUBGMobile") {
      return {
        ...baseColors,
        screen: "#0B1326",
        surface: "rgba(8,21,24,0.8)",
        elevated: "rgba(23,30,25,0.84)",
        elevatedAlt: "rgba(45,48,32,0.9)",
        border: "rgba(245,179,66,0.28)",
        borderStrong: "rgba(245,179,66,0.58)",
        text: "#fff8df",
        muted: "#ead7a6",
        dim: "#b8aa7f",
        primary: "#f5b342",
        primaryStrong: "#ff9f1a",
        primarySoft: "rgba(245,179,66,0.2)",
        accent: "#28d4e8",
        accentSoft: "rgba(40,212,232,0.15)",
        success: "#f5b342",
        danger: "#ff6b35",
        overlay: "rgba(4,8,7,0.72)",
        shadow: "#f5b342",
      };
    }

    if (selectedGameConfig.game === "FreeFire") {
      return {
        ...baseColors,
        screen: "#0B1326",
        surface: "rgba(24,12,8,0.8)",
        elevated: "rgba(42,22,13,0.84)",
        elevatedAlt: "rgba(68,31,14,0.92)",
        border: "rgba(255,122,26,0.3)",
        borderStrong: "rgba(255,196,87,0.6)",
        text: "#fff6e7",
        muted: "#f1c899",
        dim: "#ba8c68",
        primary: "#ff7a1a",
        primaryStrong: "#ff4d00",
        primarySoft: "rgba(255,122,26,0.2)",
        accent: "#ffc857",
        accentSoft: "rgba(255,200,87,0.15)",
        success: "#ffc857",
        danger: "#ff4d00",
        overlay: "rgba(12,5,3,0.74)",
        shadow: "#ff7a1a",
      };
    }

    if (selectedGameConfig.game === "TFT") {
      return {
        ...baseColors,
        screen: "#0B1326",
        surface: "rgba(8,14,32,0.8)",
        elevated: "rgba(16,24,48,0.84)",
        elevatedAlt: "rgba(28,38,72,0.92)",
        border: "rgba(109,214,255,0.3)",
        borderStrong: "rgba(255,211,102,0.56)",
        text: "#f7fbff",
        muted: "#c9daf6",
        dim: "#93a7c7",
        primary: "#6dd6ff",
        primaryStrong: "#38bdf8",
        primarySoft: "rgba(109,214,255,0.18)",
        accent: "#ffd166",
        accentSoft: "rgba(255,209,102,0.15)",
        success: "#a7f3d0",
        danger: "#ff6b9a",
        overlay: "rgba(3,7,18,0.74)",
        shadow: "#6dd6ff",
      };
    }

    if (selectedGameConfig.game === "LienQuan") {
      return {
        ...baseColors,
        screen: "#0B1326",
        surface: "rgba(12,10,32,0.8)",
        elevated: "rgba(25,18,52,0.84)",
        elevatedAlt: "rgba(42,28,78,0.92)",
        border: "rgba(143,124,255,0.32)",
        borderStrong: "rgba(255,214,102,0.58)",
        text: "#fbf8ff",
        muted: "#d9d0ff",
        dim: "#aa9dd2",
        primary: "#8f7cff",
        primaryStrong: "#7c5cff",
        primarySoft: "rgba(143,124,255,0.2)",
        accent: "#ffd666",
        accentSoft: "rgba(255,214,102,0.15)",
        success: "#7ef7d4",
        danger: "#ff6b9a",
        overlay: "rgba(5,4,18,0.74)",
        shadow: "#8f7cff",
      };
    }

    return baseColors;
  }, [baseColors, selectedGameConfig.game]);
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
  const [recruitmentTeamName, setRecruitmentTeamName] = useState("");
  const [recruitmentLobbyCode, setRecruitmentLobbyCode] = useState("");
  const [recruitmentNote, setRecruitmentNote] = useState("");
  const [recruitmentError, setRecruitmentError] = useState("");
  const [recruitmentVisible, setRecruitmentVisible] = useState(false);
  const [showOtherRecruitGames, setShowOtherRecruitGames] = useState(false);
  const [rankPreviewVisible, setRankPreviewVisible] = useState(false);
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
    if (!activeRankPreview) {
      setRankPreviewVisible(false);
    }
  }, [activeRankPreview]);

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
    const normalizedTeamName = recruitmentTeamName.trim();

    if (!normalizedTeamName) {
      const message = "Team name is required.";
      setRecruitmentError(message);
      Alert.alert("Missing team name", message);
      return;
    }

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
        teamName: normalizedTeamName,
        lobbyCode: normalizedLobbyCode,
        description: recruitmentNote.trim(),
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
      setRecruitmentTeamName("");
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

  const renderGameChip = (config, variant = "main") => {
    const selected = selectedGame === config.game;
    const isSheet = variant === "sheet";

    if (!isSheet) {
      return (
        <Pressable
          key={config.game}
          onPress={() => handleSelectGame(config.game)}
          style={({ hovered, pressed }) => [
            styles.figmaGameChip,
            selected && styles.figmaGameChipSelected,
            hovered && !selected && styles.figmaGameChipHover,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={config.label}
        >
          <Image
            source={VALORANT_FIGMA_ASSETS.games[config.game]}
            style={[styles.figmaGameIcon, selected && styles.figmaGameIconSelected]}
            resizeMode="contain"
          />
          <Text style={[styles.figmaGameLabel, selected && styles.figmaGameLabelSelected]}>
            {config.game === "LienQuan" ? "Arena of Valor" : config.label}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={config.game}
        onPress={() => handleSelectGame(config.game)}
        style={({ hovered, pressed }) => [
          styles.sheetGameChip,
          {
            backgroundColor: selected ? colors.primarySoft : colors.elevated,
            borderColor: selected ? config.color : colors.border,
            shadowColor: config.color,
          },
          hovered && [styles.gameChipHover, { borderColor: config.color }],
          pressed && styles.pressed,
        ]}
        accessibilityLabel={config.label}
      >
        {({ hovered }) => (
          <>
            <View
              style={[
                styles.gameLogoFrame,
                {
                  borderColor: selected || hovered ? config.color : "transparent",
                },
              ]}
            >
              <Image source={config.logo} style={styles.gameLogo} resizeMode="cover" />
              {hovered ? (
                <View style={[styles.gameNameOverlay, { backgroundColor: `${config.color}e6` }]}>
                  <Text style={styles.gameNameOverlayText} numberOfLines={1}>
                    {config.label}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: "#0B1326" }]}>
      <View style={styles.gameBackgroundLayer} pointerEvents="none">
        <View style={styles.pageBlurPink} />
        <View style={styles.pageBlurIndigo} />
      </View>
      <View
        style={[
          styles.header,
          compactHeader && styles.headerCompact,
          {
            borderBottomColor: "rgba(255,179,181,0.16)",
          },
        ]}
      >
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>Team up mode</Text>
          </View>
          <Text style={[styles.title, compactHeader && styles.titleCompact]} numberOfLines={1}>
            {selectedGameConfig.label} Lobby
          </Text>
        </View>
        <View style={[styles.headerActions, compactHeader && styles.headerActionsCompact]}>
          <Pressable
            onPress={refresh}
            disabled={refreshing || loading}
            style={({ hovered, pressed }) => [
              styles.headerRefreshButton,
              hovered && styles.headerRefreshButtonHover,
              pressed && styles.pressed,
              (refreshing || loading) && styles.disabled,
            ]}
            accessibilityLabel="Refresh gamer lobby"
          >
            <Image
              source={VALORANT_FIGMA_ASSETS.refresh}
              style={[styles.headerRefreshIcon, (refreshing || loading) && styles.refreshSpinning]}
              resizeMode="contain"
            />
          </Pressable>
          <LinearGradient
            colors={["#FFB3B5", "#B76DFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerRecruitGradient}
          >
            <Pressable
              onPress={() => {
                setShowOtherRecruitGames(false);
                setRecruitmentVisible(true);
              }}
              style={({ hovered, pressed }) => [
                styles.headerRecruitButton,
                hovered && styles.headerRecruitButtonHover,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.headerRecruitText}>Find a team now!</Text>
              <Image source={VALORANT_FIGMA_ASSETS.add} style={styles.headerRecruitIcon} resizeMode="contain" />
            </Pressable>
          </LinearGradient>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, compactHeader && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gameSelectionGroup}
          style={styles.gameSelectionScroll}
        >
          {GAME_CONFIGS.map(renderGameChip)}
        </ScrollView>

        <View style={[styles.valorantWorkspace, !wideLobbyLayout && styles.valorantWorkspaceCompact]}>
          <View style={[styles.rankSidebar, !wideLobbyLayout && styles.rankSidebarCompact]}>
            <View style={styles.rankFilterHeader}>
              <View style={styles.rankFilterHeading}>
                <View style={styles.rankFilterDot} />
                <Text style={styles.rankFilterTitle}>Lobby rank filter</Text>
              </View>
              {activeRankPreview ? (
                <Pressable
                  onPress={() => setRankPreviewVisible(true)}
                  style={({ hovered, pressed }) => [
                    styles.viewRanksButton,
                    hovered && styles.viewRanksButtonHover,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.viewRanksButtonText}>Ranks</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={[styles.rankFilterList, !wideLobbyLayout && styles.rankFilterListCompact]}>
            {selectedGameConfig.lobbies.map((lobby) => {
              const selected = selectedLobby === lobby.value;

              return (
                <Pressable
                  key={lobby.value}
                  onPress={() => setSelectedLobby(lobby.value)}
                  style={({ hovered, pressed }) => [
                    styles.rankFilterOption,
                    selected && styles.rankFilterOptionSelected,
                    hovered && styles.rankFilterOptionHover,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rankIconFrame}>
                    <Image
                      source={VALORANT_FIGMA_ASSETS.ranks[lobby.value] || VALORANT_FIGMA_ASSETS.ranks.group1}
                      style={styles.rankFilterIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.rankFilterCopy}>
                    <Text style={styles.rankFilterOptionTitle}>{lobby.label}</Text>
                    <Text
                      style={[
                        styles.rankFilterOptionDetail,
                        lobby.value === "group2" && styles.rankFilterOptionDetailAccent,
                      ]}
                    >
                      {lobby.detail}
                    </Text>
                  </View>
                  <View style={[styles.rankCheckbox, selected && styles.rankCheckboxSelected]} />
                </Pressable>
              );
            })}
            </View>

            <View style={styles.activePlayersCard}>
              <Text style={styles.activePlayersLabel}>Active Players Now</Text>
              <View style={styles.activePlayersValueRow}>
                <Text style={styles.activePlayersValue}>
                  {String(Math.max(0, recruitments.reduce((total, post) => total + (post.members?.length || 1), 0))).padStart(3, "0")}
                </Text>
                <Text style={styles.activePlayersTrend}>↑12%</Text>
              </View>
              <LinearGradient
                colors={["#FFB3B5", "#DDB7FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activePlayersProgress}
              />
              <View style={styles.statsDiamondBack} />
              <View style={styles.statsDiamondFront} />
            </View>
          </View>

          <View style={styles.valorantMainContent}>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={selectedGameConfig.color} size="large" />
                <Text style={[styles.loadingText, { color: colors.muted }]}>Finding teammates...</Text>
              </View>
            ) : error ? (
              <Pressable
                style={({ hovered }) => [
                  styles.empty,
                  {
                    backgroundColor: colors.surface,
                    borderColor: hovered ? selectedGameConfig.color : colors.border,
                    shadowColor: selectedGameConfig.color,
                  },
                  hovered && styles.floatingPanelHover,
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Lobby unavailable</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>{error}</Text>
              </Pressable>
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
                onOpenRecruit={() => {
                  setShowOtherRecruitGames(false);
                  setRecruitmentVisible(true);
                }}
              />
            )}
          </View>
        </View>
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
            {teamFound?.teamMatch?.teamName ? (
              <Text
                style={[
                  styles.teamFoundTeamName,
                  { color: getGameConfig(teamFound?.recruitment?.gameName).color },
                ]}
                numberOfLines={2}
              >
                {teamFound.teamMatch.teamName}
              </Text>
            ) : null}
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
        visible={rankPreviewVisible && Boolean(activeRankPreview)}
        transparent
        animationType="fade"
        onRequestClose={() => setRankPreviewVisible(false)}
      >
        <View style={[styles.rankModalOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.rankModalBackdrop} onPress={() => setRankPreviewVisible(false)} />
          <View
            style={[
              styles.rankModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedGameConfig.color,
                shadowColor: selectedGameConfig.color,
              },
            ]}
          >
            <View style={styles.rankModalHeader}>
              <View>
                <Text style={[styles.rankModalEyebrow, { color: selectedGameConfig.color }]}>
                  RANK SYSTEM
                </Text>
                <Text style={[styles.rankModalTitle, { color: colors.text }]}>
                  {selectedGameConfig.label} ranks
                </Text>
              </View>
              <Pressable
                onPress={() => setRankPreviewVisible(false)}
                style={({ hovered, pressed }) => [
                  styles.rankModalClose,
                  {
                    backgroundColor: hovered ? colors.elevatedAlt : colors.elevated,
                    borderColor: hovered ? selectedGameConfig.color : colors.border,
                  },
                  hovered && styles.rankModalCloseHover,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.rankModalCloseText, { color: selectedGameConfig.color }]}>X</Text>
              </Pressable>
            </View>
            <View style={[styles.rankImageFrame, { borderColor: `${selectedGameConfig.color}99` }]}>
              <Image source={activeRankPreview} style={styles.rankPreviewImage} resizeMode="contain" />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={recruitmentVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecruitmentVisible(false)}
      >
        <View style={[styles.filtersOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.filtersBackdrop} onPress={() => setRecruitmentVisible(false)} />
          <View style={styles.recruitmentFormSheet}>
            <Image
              source={VALORANT_FIGMA_ASSETS.recruitmentForm}
              style={styles.recruitmentFormTexture}
              resizeMode="cover"
              pointerEvents="none"
            />
            <View style={styles.recruitmentFormBlurPink} pointerEvents="none" />
            <View style={styles.recruitmentFormBlurIndigo} pointerEvents="none" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.recruitmentFormContent}>
              <View style={styles.recruitmentFormHeader}>
                <View style={styles.recruitmentFormHeaderCopy}>
                  <Text style={styles.recruitmentFormTitle}>Assemble Your Squad</Text>
                  <Text style={styles.recruitmentFormSubtitle}>
                    Configure your lobby and find the perfect teammates.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setRecruitmentVisible(false)}
                  style={({ hovered, pressed }) => [
                    styles.recruitmentCloseButton,
                    hovered && styles.recruitmentCloseButtonHover,
                    pressed && styles.pressed,
                  ]}
                  accessibilityLabel="Close recruitment form"
                >
                  <Text style={styles.recruitmentCloseText}>X</Text>
                </Pressable>
              </View>

              <View style={styles.recruitmentSectionLabelRow}>
                <Image source={VALORANT_FIGMA_ASSETS.gameLobby} style={styles.recruitmentSectionLabelIcon} resizeMode="contain" />
                <Text style={styles.recruitmentSectionLabel}>Game selection</Text>
              </View>
              <View style={styles.recruitmentGameRow}>
                <Pressable style={styles.recruitmentSelectedGame} accessibilityState={{ selected: true }}>
                  <Image
                    source={
                      selectedGameConfig.game === "Valorant"
                        ? VALORANT_FIGMA_ASSETS.recruitmentGame
                        : VALORANT_FIGMA_ASSETS.games[selectedGameConfig.game]
                    }
                    style={styles.recruitmentSelectedGameIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.recruitmentSelectedGameText}>{selectedGameConfig.label}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowOtherRecruitGames((current) => !current)}
                  style={({ hovered, pressed }) => [
                    styles.recruitmentOtherGamesButton,
                    hovered && styles.recruitmentOtherGamesButtonHover,
                    pressed && styles.pressed,
                  ]}
                >
                  <Image source={VALORANT_FIGMA_ASSETS.plus} style={styles.recruitmentOtherGamesIcon} resizeMode="contain" />
                  <Text style={styles.recruitmentOtherGamesText}>Other games</Text>
                </Pressable>
              </View>
              {showOtherRecruitGames ? (
                <View style={styles.recruitmentOtherGamesGrid}>
                  {GAME_CONFIGS.filter((config) => config.game !== selectedGameConfig.game).map((config) => (
                    <Pressable
                      key={config.game}
                      onPress={() => {
                        handleSelectGame(config.game);
                        setShowOtherRecruitGames(false);
                      }}
                      style={({ hovered, pressed }) => [
                        styles.recruitmentOtherGameChip,
                        hovered && styles.recruitmentOtherGameChipHover,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Image source={VALORANT_FIGMA_ASSETS.games[config.game]} style={styles.recruitmentOtherGameIcon} resizeMode="contain" />
                      <Text style={styles.recruitmentOtherGameText}>{config.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.recruitmentControlsGrid}>
                <View style={styles.recruitmentControlColumn}>
                  <Text style={styles.recruitmentFieldLabel}>Rank</Text>
                  <View style={styles.recruitmentStackedChoices}>
                    {selectedGameConfig.lobbies.map((lobby) => {
                      const selected = selectedLobby === lobby.value;
                      return (
                        <Pressable
                          key={lobby.value}
                          onPress={() => setSelectedLobby(lobby.value)}
                          style={({ hovered, pressed }) => [
                            styles.recruitmentChoice,
                            selected && styles.recruitmentChoiceSelected,
                            hovered && !selected && styles.recruitmentChoiceHover,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.recruitmentChoiceText, selected && styles.recruitmentChoiceTextSelected]}>
                            {lobby.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.recruitmentControlColumn}>
                  <Text style={styles.recruitmentFieldLabel}>Size</Text>
                  <View style={styles.recruitmentStackedChoices}>
                    {[2, 4].map((size) => {
                      const selected = teamSize === size;
                      return (
                        <Pressable
                          key={size}
                          onPress={() => setTeamSize(size)}
                          style={({ hovered, pressed }) => [
                            styles.recruitmentChoice,
                            selected && styles.recruitmentChoiceSelected,
                            hovered && !selected && styles.recruitmentChoiceHover,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.recruitmentChoiceText, selected && styles.recruitmentChoiceTextSelected]}>
                            {size === 2 ? "Duo" : "4 Stack"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.recruitmentControlColumn}>
                  <Text style={styles.recruitmentFieldLabel}>Mode</Text>
                  <View style={styles.recruitmentStackedChoices}>
                    {["ranked", "casual"].map((mode) => {
                      const selected = playMode === mode;
                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setPlayMode(mode)}
                          style={({ hovered, pressed }) => [
                            styles.recruitmentChoice,
                            selected && styles.recruitmentChoiceSelected,
                            hovered && !selected && styles.recruitmentChoiceHover,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.recruitmentChoiceText, selected && styles.recruitmentChoiceTextSelected]}>
                            {mode === "ranked" ? "Ranked" : "Casual"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.recruitmentInputGrid}>
                <View style={styles.recruitmentInputColumn}>
                  <Text style={styles.recruitmentFieldLabel}>Team name</Text>
                  <View style={styles.recruitmentInputShell}>
                    <TextInput
                      value={recruitmentTeamName}
                      onChangeText={setRecruitmentTeamName}
                      maxLength={60}
                      placeholder="e.g. Midnight Grinders"
                      placeholderTextColor="#9B8791"
                      autoCapitalize="words"
                      style={styles.recruitmentTextInput}
                    />
                    <Image source={VALORANT_FIGMA_ASSETS.pen} style={styles.recruitmentInputIcon} resizeMode="contain" />
                  </View>
                </View>
                {LOBBY_CODE_GAMES.includes(selectedGameConfig.game) ? (
                  <View style={styles.recruitmentInputColumn}>
                    <Text style={styles.recruitmentFieldLabel}>Lobby code</Text>
                    <View style={styles.recruitmentInputShell}>
                      <TextInput
                        value={recruitmentLobbyCode}
                        onChangeText={(value) => {
                          setRecruitmentLobbyCode(normalizeLobbyCode(value, selectedGameConfig.game));
                        }}
                        maxLength={selectedLobbyCodeRule.maxLength}
                        placeholder={selectedLobbyCodeRule.placeholder}
                        placeholderTextColor="#9B8791"
                        keyboardType={selectedLobbyCodeRule.keyboardType}
                        autoCapitalize={selectedLobbyCodeRule.autoCapitalize}
                        style={styles.recruitmentTextInput}
                      />
                      <Image source={VALORANT_FIGMA_ASSETS.code} style={styles.recruitmentInputIcon} resizeMode="contain" />
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.recruitmentDescriptionGroup}>
                <Text style={styles.recruitmentFieldLabel}>Description</Text>
                <TextInput
                  value={recruitmentNote}
                  onChangeText={setRecruitmentNote}
                  multiline
                  maxLength={300}
                  placeholder="Tell teammates your goal..."
                  placeholderTextColor="#9B8791"
                  style={styles.recruitmentDescriptionInput}
                  textAlignVertical="top"
                />
              </View>
              {recruitmentError ? <Text style={styles.recruitmentError}>{recruitmentError}</Text> : null}

              <View style={styles.recruitmentFormFooter}>
                <Pressable
                  onPress={() => setRecruitmentVisible(false)}
                  style={({ hovered, pressed }) => [
                    styles.recruitmentCancelButton,
                    hovered && styles.recruitmentCancelButtonHover,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.recruitmentCancelText}>Cancel</Text>
                </Pressable>
                <LinearGradient
                  colors={["#FFB3B5", "#DDB7FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.recruitmentPostGradient}
                >
                  <Pressable
                    disabled={posting}
                    onPress={postRecruitment}
                    style={({ hovered, pressed }) => [
                      styles.recruitmentPostButton,
                      hovered && styles.recruitmentPostButtonHover,
                      pressed && styles.pressed,
                      posting && styles.disabled,
                    ]}
                  >
                    {posting ? (
                      <ActivityIndicator color="#680019" />
                    ) : (
                      <>
                        <Text style={styles.recruitmentPostText}>Post Recruitment</Text>
                        <Image source={VALORANT_FIGMA_ASSETS.post} style={styles.recruitmentPostIcon} resizeMode="contain" />
                      </>
                    )}
                  </Pressable>
                </LinearGradient>
              </View>
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
  gameBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  pageBlurPink: {
    position: "absolute",
    width: "52%",
    aspectRatio: 1,
    left: "-12%",
    top: "5%",
    borderRadius: 9999,
    backgroundColor: "rgba(255,179,181,0.1)",
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.1,
    shadowRadius: 120,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      web: { filter: "blur(120px)" },
      default: {},
    }),
  },
  pageBlurIndigo: {
    position: "absolute",
    width: "46%",
    aspectRatio: 1,
    right: "-8%",
    bottom: "-4%",
    borderRadius: 9999,
    backgroundColor: "rgba(49,49,192,0.2)",
    shadowColor: "#3131C0",
    shadowOpacity: 0.2,
    shadowRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      web: { filter: "blur(100px)" },
      default: {},
    }),
  },
  header: {
    paddingTop: 28,
    paddingHorizontal: 36,
    paddingBottom: 20,
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
    paddingTop: 20,
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#FFB3B5",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2.8,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  eyebrowLine: {
    width: 64,
    height: 1,
    backgroundColor: "#FFB3B5",
  },
  title: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 54,
    textShadowColor: "rgba(255,179,181,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 40,
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
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(34,42,61,0.5)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRefreshButtonHover: {
    backgroundColor: "rgba(34,42,61,0.88)",
    transform: [{ translateY: -2 }, { scale: 1.04 }],
    shadowOpacity: 0.34,
  },
  headerRefreshIcon: {
    width: 20,
    height: 20,
    tintColor: "#E6BCBD",
  },
  refreshSpinning: {
    opacity: 0.55,
  },
  headerRecruitGradient: {
    borderRadius: 14,
    padding: 1,
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  headerRecruitButton: {
    minHeight: 44,
    minWidth: 184,
    borderRadius: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0B1326",
  },
  headerRecruitButtonHover: {
    backgroundColor: "#111B32",
    transform: [{ translateY: -2 }, { scale: 1.02 }],
  },
  headerRecruitText: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  headerRecruitIcon: {
    width: 16,
    height: 14,
    tintColor: "#DAE2FD",
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 1500,
    alignSelf: "center",
    paddingHorizontal: 36,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 26,
  },
  contentCompact: {
    paddingHorizontal: 16,
    gap: 18,
  },
  gameSelectionScroll: {
    flexGrow: 0,
    marginHorizontal: -4,
  },
  gameSelectionGroup: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 10,
    alignItems: "center",
  },
  figmaGameChip: {
    minHeight: 52,
    borderRadius: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#141E33",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  figmaGameChipSelected: {
    backgroundColor: "#FF5167",
    shadowColor: "#FF5167",
    shadowOpacity: 0.38,
    shadowRadius: 16,
    transform: [{ translateY: -1 }],
  },
  figmaGameChipHover: {
    backgroundColor: "#1D2941",
    transform: [{ translateY: -3 }],
    shadowOpacity: 0.35,
  },
  figmaGameIcon: {
    width: 24,
    height: 24,
    tintColor: "#E6BCBD",
  },
  figmaGameIconSelected: {
    tintColor: "#5B0015",
  },
  figmaGameLabel: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
  },
  figmaGameLabelSelected: {
    color: "#5B0015",
  },
  valorantWorkspace: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 28,
  },
  valorantWorkspaceCompact: {
    flexDirection: "column",
  },
  rankSidebar: {
    width: 230,
    flexShrink: 0,
    gap: 14,
  },
  rankSidebarCompact: {
    width: "100%",
  },
  rankFilterHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rankFilterHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankFilterDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: "#C0C1FF",
    shadowColor: "#C0C1FF",
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  rankFilterTitle: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  viewRanksButton: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,42,61,0.72)",
    borderWidth: 1,
    borderColor: "rgba(192,193,255,0.2)",
  },
  viewRanksButtonHover: {
    borderColor: "#C0C1FF",
    transform: [{ translateY: -2 }],
  },
  viewRanksButtonText: {
    color: "#C0C1FF",
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  rankFilterList: {
    gap: 10,
  },
  rankFilterListCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  rankFilterOption: {
    minHeight: 84,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141E33",
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    flexGrow: 1,
    minWidth: 210,
  },
  rankFilterOptionSelected: {
    borderLeftWidth: 4,
    borderLeftColor: "#B76DFF",
    shadowColor: "#B76DFF",
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  rankFilterOptionHover: {
    transform: [{ translateY: -3 }],
    backgroundColor: "#19253D",
  },
  rankIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1428",
  },
  rankFilterIcon: {
    width: 24,
    height: 24,
  },
  rankFilterCopy: {
    flex: 1,
    gap: 3,
  },
  rankFilterOptionTitle: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "700",
  },
  rankFilterOptionDetail: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "500",
  },
  rankFilterOptionDetailAccent: {
    color: "#DDB7FF",
  },
  rankCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255,180,171,0.42)",
  },
  rankCheckboxSelected: {
    borderColor: "#C0C1FF",
    backgroundColor: "#C0C1FF",
  },
  activePlayersCard: {
    minHeight: 160,
    borderRadius: 14,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#222A3D",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  activePlayersLabel: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: "600",
  },
  activePlayersValueRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    zIndex: 2,
  },
  activePlayersValue: {
    color: "#FFB3B5",
    fontFamily: "Inter",
    fontSize: 54,
    lineHeight: 58,
    fontWeight: "800",
  },
  activePlayersTrend: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 14,
    marginBottom: 8,
  },
  activePlayersProgress: {
    width: "72%",
    height: 5,
    borderRadius: 3,
    marginTop: 14,
    zIndex: 2,
  },
  statsDiamondBack: {
    position: "absolute",
    right: -5,
    bottom: 26,
    width: 88,
    height: 44,
    backgroundColor: "rgba(192,193,255,0.08)",
    transform: [{ rotate: "30deg" }],
  },
  statsDiamondFront: {
    position: "absolute",
    right: 5,
    bottom: -2,
    width: 100,
    height: 48,
    backgroundColor: "rgba(221,183,255,0.06)",
    transform: [{ rotate: "-28deg" }],
  },
  valorantMainContent: {
    flex: 1,
    minWidth: 0,
  },
  gameRankRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameRankRowCompact: {
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  rankSideSpacer: {
    width: 112,
    flexShrink: 0,
  },
  gameLogoCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  gameGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  gameChip: {
    width: 74,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  gameChipCompact: {
    width: 72,
    minWidth: 72,
    maxWidth: 72,
    minHeight: 72,
    flexGrow: 0,
    flexBasis: 72,
  },
  gameChipHover: {
    transform: [{ translateY: -6 }, { scale: 1.09 }, { rotate: "-1deg" }],
    shadowOpacity: 0.42,
    shadowRadius: 18,
  },
  gameLogoFrame: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gameLogo: {
    width: "100%",
    height: "100%",
  },
  gameNameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  gameNameOverlayText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  sheetGameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  sheetGameChip: {
    width: 76,
    minWidth: 76,
    maxWidth: 76,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    flexGrow: 0,
    flexBasis: 76,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  rankButtonSlot: {
    width: 112,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  rankButtonSlotCompact: {
    width: "100%",
    alignItems: "center",
  },
  rankButton: {
    minWidth: 96,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  rankButtonHover: {
    shadowOpacity: 0.38,
    shadowRadius: 18,
    transform: [{ translateY: -4 }, { scale: 1.06 }],
  },
  rankButtonText: {
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rankModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  rankModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  rankModalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "86%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  rankModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rankModalEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  rankModalTitle: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "900",
  },
  rankModalClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankModalCloseHover: {
    transform: [{ translateY: -2 }, { scale: 1.05 }],
  },
  rankModalCloseText: {
    fontSize: 16,
    fontWeight: "900",
  },
  rankImageFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  rankPreviewImage: {
    width: "100%",
    height: "100%",
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
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  teamNameInput: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: "800",
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  filtersBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  recruitmentFormSheet: {
    width: "100%",
    maxWidth: 1180,
    maxHeight: "94%",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "rgba(34,42,61,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  recruitmentFormTexture: {
    ...StyleSheet.absoluteFillObject,
    width: "112%",
    height: "112%",
    left: "-6%",
    top: "-6%",
    opacity: 0.58,
  },
  recruitmentFormBlurPink: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 999,
    left: -150,
    bottom: -160,
    backgroundColor: "rgba(255,179,181,0.1)",
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.1,
    shadowRadius: 120,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({ web: { filter: "blur(120px)" }, default: {} }),
  },
  recruitmentFormBlurIndigo: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    right: -120,
    top: -120,
    backgroundColor: "rgba(49,49,192,0.2)",
    shadowColor: "#3131C0",
    shadowOpacity: 0.2,
    shadowRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({ web: { filter: "blur(100px)" }, default: {} }),
  },
  recruitmentFormContent: {
    paddingHorizontal: 42,
    paddingTop: 36,
    paddingBottom: 34,
    gap: 26,
  },
  recruitmentFormHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
  },
  recruitmentFormHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  recruitmentFormTitle: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    textShadowColor: "rgba(255,179,181,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  recruitmentFormSubtitle: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
  },
  recruitmentCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,19,38,0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.3)",
  },
  recruitmentCloseButtonHover: {
    borderColor: "#FFB3B5",
    backgroundColor: "rgba(255,179,181,0.16)",
    transform: [{ scale: 1.06 }],
  },
  recruitmentCloseText: {
    color: "#FFB3B5",
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "800",
  },
  recruitmentSectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  recruitmentSectionLabelIcon: {
    width: 20,
    height: 18,
    tintColor: "#E6BCBD",
  },
  recruitmentSectionLabel: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  recruitmentGameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  recruitmentSelectedGame: {
    minHeight: 82,
    minWidth: 250,
    paddingHorizontal: 26,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FFB3B5",
    backgroundColor: "rgba(11,19,38,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  recruitmentSelectedGameIcon: {
    width: 32,
    height: 32,
    tintColor: "#FFB3B5",
  },
  recruitmentSelectedGameText: {
    color: "#FFB3B5",
    fontFamily: "Inter",
    fontSize: 25,
    fontWeight: "700",
  },
  recruitmentOtherGamesButton: {
    minHeight: 82,
    minWidth: 250,
    paddingHorizontal: 26,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(93,63,64,0.3)",
    backgroundColor: "rgba(11,19,38,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  recruitmentOtherGamesButtonHover: {
    borderColor: "rgba(255,179,181,0.6)",
    backgroundColor: "rgba(255,179,181,0.08)",
    transform: [{ translateY: -2 }],
  },
  recruitmentOtherGamesIcon: {
    width: 24,
    height: 24,
    tintColor: "#E6BCBD",
  },
  recruitmentOtherGamesText: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 19,
    fontWeight: "500",
  },
  recruitmentOtherGamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: -12,
  },
  recruitmentOtherGameChip: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(11,19,38,0.68)",
    borderWidth: 1,
    borderColor: "rgba(93,63,64,0.3)",
  },
  recruitmentOtherGameChipHover: {
    borderColor: "#FFB3B5",
    transform: [{ translateY: -2 }],
  },
  recruitmentOtherGameIcon: {
    width: 18,
    height: 18,
    tintColor: "#E6BCBD",
  },
  recruitmentOtherGameText: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "700",
  },
  recruitmentControlsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
  },
  recruitmentControlColumn: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 10,
  },
  recruitmentFieldLabel: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  recruitmentStackedChoices: {
    gap: 10,
  },
  recruitmentChoice: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,19,38,0.68)",
    borderWidth: 1,
    borderColor: "rgba(93,63,64,0.3)",
  },
  recruitmentChoiceSelected: {
    backgroundColor: "rgba(255,179,181,0.2)",
    borderColor: "rgba(255,179,181,0.5)",
  },
  recruitmentChoiceHover: {
    borderColor: "rgba(255,179,181,0.65)",
    backgroundColor: "rgba(255,179,181,0.1)",
    transform: [{ translateY: -2 }],
  },
  recruitmentChoiceText: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: "700",
  },
  recruitmentChoiceTextSelected: {
    color: "#E6BCBD",
  },
  recruitmentInputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
  },
  recruitmentInputColumn: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 10,
  },
  recruitmentInputShell: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(93,63,64,0.3)",
    backgroundColor: "rgba(11,19,38,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 18,
  },
  recruitmentTextInput: {
    flex: 1,
    minWidth: 0,
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: "400",
    paddingVertical: 12,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
      },
      default: {},
    }),
  },
  recruitmentInputIcon: {
    width: 22,
    height: 22,
    tintColor: "#B77E8D",
    marginLeft: 12,
  },
  recruitmentDescriptionGroup: {
    gap: 10,
  },
  recruitmentDescriptionInput: {
    minHeight: 128,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(93,63,64,0.3)",
    backgroundColor: "rgba(11,19,38,0.8)",
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "400",
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
      },
      default: {},
    }),
  },
  recruitmentFormFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 20,
    paddingTop: 6,
  },
  recruitmentCancelButton: {
    minHeight: 54,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recruitmentCancelButtonHover: {
    transform: [{ translateY: -2 }],
  },
  recruitmentCancelText: {
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 17,
    fontWeight: "600",
  },
  recruitmentPostGradient: {
    minWidth: 270,
    minHeight: 58,
    borderRadius: 18,
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
  recruitmentPostButton: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
  },
  recruitmentPostButtonHover: {
    transform: [{ translateY: -3 }, { scale: 1.02 }],
  },
  recruitmentPostText: {
    color: "#680019",
    fontFamily: "Inter",
    fontSize: 17,
    fontWeight: "800",
  },
  recruitmentPostIcon: {
    width: 18,
    height: 18,
    tintColor: "#680019",
  },
  filtersSheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  recruitmentBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  recruitmentBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  recruitmentBackgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,8,18,0.48)",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 58,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 2,
    zIndex: 2,
  },
  filtersHeader: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    zIndex: 2,
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
    zIndex: 2,
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
  postBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "112%",
    height: "112%",
    left: "-6%",
    top: "-6%",
    opacity: 0.94,
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
  valorantEmptyState: {
    minHeight: 560,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 44,
    gap: 20,
    overflow: "hidden",
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  emptySearchTarget: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.48)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,179,181,0.04)",
  },
  emptySearchSquare: {
    width: 62,
    height: 62,
    borderWidth: 1,
    borderColor: "rgba(183,109,255,0.66)",
    backgroundColor: "rgba(183,109,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySearchIcon: {
    width: 34,
    height: 34,
    tintColor: "#FFB3B5",
  },
  valorantEmptyTitle: {
    fontFamily: "Inter",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
  },
  valorantEmptyDescription: {
    maxWidth: 620,
    color: "#E6BCBD",
    fontFamily: "Inter",
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "400",
    textAlign: "center",
  },
  openRecruitButton: {
    width: "100%",
    maxWidth: 280,
    minWidth: 0,
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#222A3D",
    shadowColor: "#FFB3B5",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  openRecruitButtonHover: {
    backgroundColor: "#2B344A",
    shadowOpacity: 0.32,
    transform: [{ translateY: -3 }, { scale: 1.02 }],
  },
  openRecruitIcon: {
    width: 20,
    height: 16,
    tintColor: "#FFB3B5",
  },
  openRecruitButtonText: {
    color: "#DAE2FD",
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  teamFoundTeamName: {
    marginTop: -8,
    fontSize: 18,
    fontWeight: "900",
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
  floatingPanelHover: {
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    transform: [{ translateY: -3 }, { scale: 1.005 }],
    elevation: 5,
  },
  disabled: {
    opacity: 0.55,
  },
});

