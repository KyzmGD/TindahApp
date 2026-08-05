import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import CardStack from "../components/swipe/CardStack";
import { discover, sendSwipe } from "../services/swipe.api";
import MatchModal from "../components/common/MatchModal";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";

const GENDER_OPTIONS = [
  { label: "Women", value: "woman" },
  { label: "Men", value: "man" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Other", value: "other" },
];
const ALL_GENDER_VALUES = GENDER_OPTIONS.map((option) => option.value);
const EXPLORE_BACKGROUND = require("../../assets/explore-hearts-bg.png");
const STITCH_TINDAH_LOGO = require("../../assets/tindah_logo_stitch.png");
const HEART_ICON = require("../../assets/figma-explore/heart.png");
const CANCEL_ICON = require("../../assets/figma-explore/cancel.png");
const DESKTOP_SIDEBAR_WIDTH = 288;
const LIVE_ACTIVITY_ITEMS = [
  {
    key: "onlineGamers",
    title: "Top gamers online",
    accent: "#ffb3b5",
    icon: "SH",
  },
  {
    key: "activeParties",
    title: "Active parties",
    accent: "#c0c1ff",
    icon: "GP",
  },
  {
    key: "activeMatches",
    title: "Match found",
    accent: "#ddb7ff",
    icon: "FX",
  },
];
const SEARCH_FILTER_CONFIGS = {
  interests: {
    icon: "TAG",
    label: "Interests",
    mode: "multi",
    options: [
      "Football",
      "Gaming",
      "Travel",
      "Coffee",
      "Music",
      "Movies",
      "Gym",
      "Photography",
      "Cooking",
      "Reading",
      "Hiking",
      "Technology",
      "Pets",
      "Foodie",
    ],
  },
  looking: {
    icon: "EYE",
    label: "Looking for",
    mode: "single",
    options: [
      "Long-term partner",
      "Long-term, open to short",
      "Short-term fun",
      "New friends",
      "Still figuring it out",
    ],
  },
  languages: {
    icon: "A",
    label: "Languages",
    mode: "multi",
    options: ["English", "Vietnamese", "Korean", "Japanese", "Chinese", "French", "Spanish"],
  },
  education: {
    icon: "EDU",
    label: "Education",
    mode: "single",
    options: ["High school", "College", "Bachelor's degree", "Master's degree", "PhD"],
  },
  family: {
    icon: "FAM",
    label: "Family plans",
    mode: "single",
    options: ["Want children", "Open to children", "Do not want children", "Have children", "Not sure yet"],
  },
  pets: {
    icon: "PET",
    label: "Pets",
    mode: "multi",
    options: ["Dog", "Cat", "Fish", "Bird", "No pets", "Want pets", "Pet-free"],
  },
  drinking: {
    icon: "BAR",
    label: "Drinking",
    mode: "single",
    options: ["Not for me", "Sober", "On special occasions", "Socially on weekends", "Most nights"],
  },
  smoking: {
    icon: "SMK",
    label: "Smoking",
    mode: "single",
    options: ["Non-smoker", "Social smoker", "Smoker", "Trying to quit", "Prefer not to say"],
  },
  workout: {
    icon: "FIT",
    label: "Workout",
    mode: "single",
    options: ["Every day", "Often", "Sometimes", "Almost never", "Prefer not to say"],
  },
};
const SEARCH_FILTER_IDS = [
  "interests",
  "looking",
  "languages",
  "education",
  "family",
  "pets",
  "drinking",
  "smoking",
  "workout",
];

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function normalizeSelection(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function formatSelectionValue(value) {
  const selected = normalizeSelection(value);

  if (!selected.length) {
    return "Any";
  }

  if (selected.length === 1) {
    return selected[0];
  }

  return `${selected.length} selected`;
}

function getFilterForm(user) {
  const preferences = user?.preferences || {};
  const ageRange = preferences.ageRange || {};
  const advancedFilters = user?.advancedFilters || preferences.advancedFilters || {};

  return {
    genderPreference:
      user?.genderPreference ||
      user?.interestedIn ||
      preferences.genderPreference ||
      ALL_GENDER_VALUES,
    maxDistanceKm: clamp(user?.maxDistanceKm || preferences.maxDistanceKm || 80, 2, 100),
    minAge: clamp(user?.minAge || ageRange.min || 18, 18, 100),
    maxAge: clamp(user?.maxAge || ageRange.max || 38, 18, 100),
    expandDistance: user?.expandDistance ?? preferences.expandDistance ?? true,
    expandAge: user?.expandAge ?? preferences.expandAge ?? true,
    advancedFilters,
  };
}

function SkeletonBlock({ style, animatedStyle, colors }) {
  return (
    <Animated.View
      style={[
        styles.skeletonBlock,
        { backgroundColor: colors.skeletonBase },
        animatedStyle,
        style,
      ]}
    />
  );
}

function ExploreSkeleton({ colors }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 820,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 820,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const animatedStyle = {
    opacity: shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [0.42, 1],
    }),
  };

  return (
    <View
      style={[
        styles.skeletonCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.skeletonTopRow}>
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonPillSmall}
        />
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonMatchBadge}
        />
      </View>

      <View style={styles.skeletonCenter}>
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonPhotoGlow}
        />
      </View>

      <View style={styles.skeletonBottom}>
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonPill}
        />
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonName}
        />
        <SkeletonBlock
          colors={colors}
          animatedStyle={animatedStyle}
          style={styles.skeletonLine}
        />
        <View style={styles.skeletonTagRow}>
          <SkeletonBlock
            colors={colors}
            animatedStyle={animatedStyle}
            style={styles.skeletonTag}
          />
          <SkeletonBlock
            colors={colors}
            animatedStyle={animatedStyle}
            style={styles.skeletonTag}
          />
          <SkeletonBlock
            colors={colors}
            animatedStyle={animatedStyle}
            style={styles.skeletonTagShort}
          />
        </View>
        <View
          style={[
            styles.skeletonPrompt,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.border,
            },
          ]}
        >
          <SkeletonBlock
            colors={colors}
            animatedStyle={animatedStyle}
            style={styles.skeletonPromptLine}
          />
          <SkeletonBlock
            colors={colors}
            animatedStyle={animatedStyle}
            style={styles.skeletonPromptAction}
          />
        </View>
      </View>
    </View>
  );
}

function formatActivityCount(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";
}

function LiveActivityPanel({ activeMatchCount, colors, height, isCompact, liveLobbyStats }) {
  const activityItems = LIVE_ACTIVITY_ITEMS.map((item) => {
    if (item.key === "onlineGamers") {
      return { ...item, detail: `${formatActivityCount(liveLobbyStats?.onlineGamers)} online now` };
    }
    if (item.key === "activeParties") {
      const count = Number(liveLobbyStats?.activeParties);
      return { ...item, detail: `${formatActivityCount(count)} recruitment ${count === 1 ? "post" : "posts"}` };
    }
    const count = Number(activeMatchCount);
    return { ...item, detail: `${formatActivityCount(activeMatchCount)} active ${count === 1 ? "match" : "matches"}` };
  });

  return (
    <View
      style={[
        styles.activityPanel,
        {
          backgroundColor: "rgba(23,31,51,0.58)",
          borderColor: "rgba(255,255,255,0.08)",
          shadowColor: colors.accent,
        },
        height ? { height, minHeight: height } : null,
        isCompact && styles.activityPanelCompact,
      ]}
    >
      <View style={styles.activityHeader}>
        <Text style={[styles.activityTitle, { color: colors.text }]}>Live Activity</Text>
        <View style={[styles.activityPing, { backgroundColor: colors.accent }]} />
      </View>
      <View style={[styles.activityList, isCompact && styles.activityListCompact]}>
        {activityItems.map((item, index) => (
          <Pressable
            key={item.title}
            style={({ hovered, pressed }) => [
              styles.activityItem,
              isCompact && styles.activityItemCompact,
              {
                backgroundColor: index === 2 ? "rgba(45,52,73,0.72)" : "rgba(11,19,38,0.56)",
                borderColor: hovered ? item.accent : "rgba(255,255,255,0.06)",
              },
              hovered && {
                transform: [{ translateX: -4 }, { scale: 1.015 }],
                shadowColor: item.accent,
                shadowOpacity: 0.18,
                shadowRadius: 12,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={[styles.activityIcon, { backgroundColor: `${item.accent}26` }]}>
              <Text style={[styles.activityIconText, { color: item.accent }]}>{item.icon}</Text>
            </View>
            <View style={styles.activityCopy}>
              <Text style={[styles.activityItemTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.activityItemDetail, { color: item.accent }]} numberOfLines={2}>
                {item.detail}
              </Text>
            </View>
            <Text style={[styles.activityTime, { color: item.accent }]}>LIVE</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ExploreScreen({ activeMatchCount, liveLobbyStats, onMatchCreated }) {
  const { user, updateProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isDesktopShell = viewportWidth >= 1024;
  const mainViewportWidth = isDesktopShell
    ? viewportWidth - DESKTOP_SIDEBAR_WIDTH
    : viewportWidth;
  const isWideLayout = mainViewportWidth >= 880;
  const isMediumLayout = mainViewportWidth >= 680;
  const [users, setUsers] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchBanner, setMatchBanner] = useState("");
  const [error, setError] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filtersSaving, setFiltersSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [filterMessage, setFilterMessage] = useState("");
  const [activeSearchFilterId, setActiveSearchFilterId] = useState(null);
  const [filterForm, setFilterForm] = useState(() => getFilterForm(user));
  const pulse = useRef(new Animated.Value(0)).current;
  const cardHover = useRef(new Animated.Value(0)).current;
  const [isCardHovered, setIsCardHovered] = useState(false);
  const animateCardHover = useCallback((hovered) => {
    setIsCardHovered(hovered);
    Animated.spring(cardHover, {
      toValue: hovered ? 1 : 0,
      tension: 150,
      friction: 13,
      useNativeDriver: true,
    }).start();
  }, [cardHover]);
  const cardHoverStyle = {
    transform: [
      {
        translateY: cardHover.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -7],
        }),
      },
      {
        scale: cardHover.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.012],
        }),
      },
    ],
  };
  const cardFrameStyle = useMemo(() => {
    const horizontalSpace = isWideLayout ? 0 : 28;
    const maxWidth = isWideLayout ? 430 : 390;
    const minHeight = isMediumLayout ? 520 : 460;
    const maxHeight = isWideLayout ? 580 : 560;

    return {
      width: Math.min(Math.max(mainViewportWidth - horizontalSpace, 288), maxWidth),
      height: Math.min(Math.max(viewportHeight * 0.66, minHeight), maxHeight),
    };
  }, [isMediumLayout, isWideLayout, mainViewportWidth, viewportHeight]);

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
const [matchedMatch, setMatchedMatch] =
  useState(null);

  useEffect(() => {
    setFilterForm(getFilterForm(user));
  }, [user]);

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
    const matchId = matchedMatch?._id || matchedMatch?.id;
    setShowMatchModal(false);
    navigation.navigate("Matches", {
      matchId,
      targetUserId: matchedUser?._id || matchedUser?.id,
      openRequestId: `dating-${matchId || "latest"}-${Date.now()}`,
    });
  };

  const openFilters = () => {
    setFilterForm(getFilterForm(user));
    setFilterMessage("");
    setFiltersVisible(true);
  };

  const closeFilters = () => {
    if (!filtersSaving) {
      setActiveSearchFilterId(null);
      setFiltersVisible(false);
    }
  };

  const toggleGenderPreference = (value) => {
    setFilterForm((current) => {
      const selected = current.genderPreference.includes(value)
        ? current.genderPreference.filter((item) => item !== value)
        : [...current.genderPreference, value];

      return {
        ...current,
        genderPreference: selected.length ? selected : current.genderPreference,
      };
    });
  };

  const updateMinAge = (value) => {
    const nextMin = Math.round(value);
    setFilterForm((current) => ({
      ...current,
      minAge: Math.min(nextMin, current.maxAge),
    }));
  };

  const updateMaxAge = (value) => {
    const nextMax = Math.round(value);
    setFilterForm((current) => ({
      ...current,
      maxAge: Math.max(nextMax, current.minAge),
    }));
  };

  const saveFilters = async () => {
    setFiltersSaving(true);
    setError("");

    try {
      await updateProfile({
        genderPreference: filterForm.genderPreference,
        maxDistanceKm: filterForm.maxDistanceKm,
        minAge: filterForm.minAge,
        maxAge: filterForm.maxAge,
        expandDistance: filterForm.expandDistance,
        expandAge: filterForm.expandAge,
        advancedFilters: filterForm.advancedFilters,
      });
      setActiveSearchFilterId(null);
      setFiltersVisible(false);
      setLoading(true);
      await loadProfiles();
    } catch (filterError) {
      setError(filterError.message || "Unable to save filters.");
    } finally {
      setFiltersSaving(false);
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    const geolocation = globalThis.navigator?.geolocation;

    if (!geolocation) {
      setFilterMessage("Location is not available in this environment.");
      return;
    }

    setLocating(true);
    setFilterMessage("");

    geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;

        try {
          await updateProfile({
            location: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
          });
          setFilterMessage("Location updated.");
          setLoading(true);
          await loadProfiles();
        } catch (locationError) {
          setFilterMessage(locationError.message || "Unable to save location.");
        } finally {
          setLocating(false);
          setLoading(false);
        }
      },
      (locationError) => {
        setFilterMessage(locationError.message || "Could not read your location.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const selectedGenderLabel = useMemo(() => {
    if (
      !filterForm.genderPreference.length ||
      filterForm.genderPreference.length === GENDER_OPTIONS.length
    ) {
      return "Everyone";
    }

    return GENDER_OPTIONS
      .filter((option) => filterForm.genderPreference.includes(option.value))
      .map((option) => option.label)
      .join(", ");
  }, [filterForm.genderPreference]);

  const activeSearchFilter = activeSearchFilterId
    ? SEARCH_FILTER_CONFIGS[activeSearchFilterId]
    : null;
  const activeSearchSelection = activeSearchFilterId
    ? normalizeSelection(filterForm.advancedFilters?.[activeSearchFilterId])
    : [];

  const updateAdvancedFilter = (filterId, value) => {
    setFilterForm((current) => ({
      ...current,
      advancedFilters: {
        ...current.advancedFilters,
        [filterId]: value,
      },
    }));
  };

  const toggleAdvancedFilterOption = (option) => {
    if (!activeSearchFilterId || !activeSearchFilter) {
      return;
    }

    if (activeSearchFilter.mode === "multi") {
      const selected = activeSearchSelection.includes(option)
        ? activeSearchSelection.filter((item) => item !== option)
        : [...activeSearchSelection, option];
      updateAdvancedFilter(activeSearchFilterId, selected);
      return;
    }

    updateAdvancedFilter(
      activeSearchFilterId,
      activeSearchSelection.includes(option) ? "" : option,
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
  setMatchedMatch(result.match);
  setShowMatchModal(true);
  onMatchCreated?.();
    }
  } catch (swipeError) {
    setUsers((current) => [user, ...current]);
    setRemaining((current) => current + 1);
    setError(swipeError.message);
  }
};

  const renderSwipeActions = () => (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pass on this profile"
        style={({ hovered, pressed }) => [
          styles.actionButton,
          styles.nope,
          {
            backgroundColor: "rgba(34,42,61,0.8)",
            shadowColor: "#ffb4ab",
            shadowOpacity: 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          hovered && {
            backgroundColor: "rgba(45,52,73,0.94)",
            transform: [{ translateY: -2 }, { scale: 1.04 }],
            shadowOpacity: 0.28,
          },
          pressed && styles.actionPressed,
        ]}
        onPress={() => users[0] && handleSwipe(users[0], "nope")}
      >
        <Image
          source={CANCEL_ICON}
          style={styles.cancelActionIcon}
          resizeMode="contain"
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Like this profile"
        style={({ hovered, pressed }) => [
          styles.actionButton,
          styles.like,
          {
            backgroundColor: "transparent",
            shadowColor: "#ff5167",
            shadowOpacity: 0.34,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 7,
          },
          hovered && {
            transform: [{ translateY: -2 }, { scale: 1.05 }],
            shadowOpacity: 0.42,
          },
          pressed && styles.actionPressed,
        ]}
        onPress={() => users[0] && handleSwipe(users[0], "like")}
      >
        {({ hovered }) => (
          <LinearGradient
            colors={hovered ? ["#ffc1c3", "#ff6376"] : ["#ffb3b5", "#ff5167"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.likeGradient}
          >
            <Animated.Image
              source={HEART_ICON}
              resizeMode="contain"
              style={[
                styles.heartActionIcon,
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
            />
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );

  return (
    <ImageBackground
      source={EXPLORE_BACKGROUND}
      style={[styles.screen, { backgroundColor: colors.screen }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.backgroundTint} />
      <View pointerEvents="none" style={styles.hexLayer}>
        {Array.from({ length: 11 }).map((_, row) => (
          <View key={`hex-${row}`} style={styles.hexRow}>
            {Array.from({ length: 10 }).map((__, col) => (
              <View key={`hex-${row}-${col}`} style={styles.hexCell} />
            ))}
          </View>
        ))}
      </View>
      <View
        style={[
          styles.header,
          isDesktopShell && styles.headerDesktop,
          {
            backgroundColor: "rgba(11,19,38,0.84)",
            borderBottomColor: "rgba(255,255,255,0.08)",
          },
        ]}
      >
        {!isDesktopShell ? (
          <View style={styles.brand}>
            <Image source={STITCH_TINDAH_LOGO} style={styles.stitchLogo} resizeMode="contain" />
            <Text style={[styles.logo, { color: "#dae2fd" }]}>Tindah</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.headerRight}>
          {isMediumLayout ? (
            <View style={styles.playerCopy}>
              <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                {user?.name || "Pro Player"}
              </Text>
              <Text style={[styles.playerLevel, { color: colors.muted }]}>Level 42</Text>
            </View>
          ) : null}
          <Pressable
            style={({ hovered, pressed }) => [
              styles.filterButton,
              {
                backgroundColor: "rgba(23,31,51,0.74)",
                borderColor: "rgba(255,255,255,0.1)",
              },
              hovered && {
                backgroundColor: "rgba(255,81,103,0.2)",
                borderColor: colors.primary,
                transform: [{ translateY: -2 }, { scale: 1.03 }],
              },
              pressed && styles.buttonPressed,
            ]}
            onPress={openFilters}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>Filters</Text>
          </Pressable>
        </View>
      </View>

      {matchBanner ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.bannerText, { color: colors.text }]}>{matchBanner}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.exploreLayout, isWideLayout && styles.exploreLayoutWide]}>
          <View style={[styles.swipeColumn, isWideLayout && styles.swipeColumnWide]}>
            <View style={styles.stackGhostBack} />
            <View style={styles.stackGhostFront} />
            {loading ? (
              <View style={[styles.cardFrame, cardFrameStyle]}>
                <ExploreSkeleton colors={colors} />
              </View>
            ) : error ? (
              <View style={[styles.errorBox, cardFrameStyle]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.retryButton,
                    { backgroundColor: colors.primary },
                    hovered && {
                      backgroundColor: colors.primaryStrong,
                      transform: [{ translateY: -2 }, { scale: 1.03 }],
                    },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={refresh}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <Animated.View
                onPointerEnter={() => animateCardHover(true)}
                onPointerLeave={() => animateCardHover(false)}
                style={[
                  styles.cardFrame,
                  cardFrameStyle,
                  cardHoverStyle,
                  isCardHovered && styles.cardFrameHover,
                ]}
              >
                <CardStack
                  users={users}
                  remaining={remaining}
                  onNope={(user) => handleSwipe(user, "nope")}
                  onLike={(user) => handleSwipe(user, "like")}
                />
              </Animated.View>
            )}
            {renderSwipeActions()}
          </View>
          {isWideLayout ? (
            <LiveActivityPanel
              activeMatchCount={activeMatchCount}
              colors={colors}
              height={cardFrameStyle.height}
              liveLobbyStats={liveLobbyStats}
            />
          ) : null}
        </View>
        {!isWideLayout ? (
          <LiveActivityPanel
            activeMatchCount={activeMatchCount}
            colors={colors}
            isCompact
            liveLobbyStats={liveLobbyStats}
          />
        ) : null}
      </ScrollView>
      <MatchModal
  visible={showMatchModal}
  currentUser={user}
  matchedUser={matchedUser}
  onClose={() => setShowMatchModal(false)}
  onMessage={openChat}
/>
      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilters}
      >
        <View style={[styles.filtersOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.filtersBackdrop} onPress={closeFilters} />
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
              <Text style={[styles.filtersTitle, { color: colors.text }]}>Search settings</Text>
              <Pressable
                disabled={filtersSaving}
                onPress={saveFilters}
                style={({ hovered, pressed }) => [
                  styles.doneFilterButton,
                  hovered && styles.doneFilterButtonHover,
                  pressed && styles.buttonPressed,
                ]}
              >
                {filtersSaving ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={[styles.doneFilterText, { color: colors.accent }]}>Done</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>Discovery</Text>

              <View style={[styles.discoveryCard, { backgroundColor: colors.surface }]}>
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.locationRow,
                    hovered && {
                      backgroundColor: colors.elevated,
                      transform: [{ translateX: 4 }],
                    },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={useCurrentLocation}
                  disabled={locating}
                >
                  {({ hovered }) => (
                    <>
                      <View style={styles.locationCopy}>
                        <Text style={[styles.settingTitle, { color: colors.text }]}>Location</Text>
                        <Text style={[styles.settingHint, { color: colors.muted }]}>
                          Change where matches are discovered.
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.locationValue,
                          { color: hovered ? colors.text : colors.muted },
                        ]}
                      >
                        {locating ? "Locating..." : "Use current location"}
                      </Text>
                      <Text
                        style={[
                          styles.rowChevron,
                          { color: hovered ? colors.text : colors.muted },
                        ]}
                      >
                        {">"}
                      </Text>
                    </>
                  )}
                </Pressable>
                {filterMessage ? (
                  <Text style={[styles.filterMessage, { color: colors.muted }]}>{filterMessage}</Text>
                ) : null}

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Maximum distance</Text>
                  <Text style={[styles.settingValue, { color: colors.muted }]}>
                    {filterForm.maxDistanceKm} km
                  </Text>
                </View>
                <Slider
                  minimumValue={2}
                  maximumValue={100}
                  step={1}
                  value={filterForm.maxDistanceKm}
                  minimumTrackTintColor={colors.primaryStrong}
                  maximumTrackTintColor={colors.borderStrong}
                  thumbTintColor={colors.text}
                  onValueChange={(value) =>
                    setFilterForm((current) => ({
                      ...current,
                      maxDistanceKm: Math.round(value),
                    }))
                  }
                />
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleText, { color: colors.muted }]}>
                    Show people farther away if I run out of profiles.
                  </Text>
                  <Switch
                    value={filterForm.expandDistance}
                    onValueChange={(value) =>
                      setFilterForm((current) => ({
                        ...current,
                        expandDistance: value,
                      }))
                    }
                    trackColor={{ false: colors.borderStrong, true: colors.primaryStrong }}
                    thumbColor={colors.text}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Interested in</Text>
                  <Text style={[styles.settingValue, { color: colors.muted }]} numberOfLines={1}>
                    {selectedGenderLabel}
                  </Text>
                </View>
                <View style={styles.genderGrid}>
                  {GENDER_OPTIONS.map((option) => {
                    const selected = filterForm.genderPreference.includes(option.value);

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleGenderPreference(option.value)}
                        style={({ hovered, pressed }) => [
                          styles.genderChip,
                          {
                            backgroundColor: colors.elevated,
                            borderColor: colors.borderStrong,
                          },
                          selected && {
                            backgroundColor: colors.primarySoft,
                            borderColor: colors.primary,
                          },
                          hovered && {
                            backgroundColor: colors.elevatedAlt,
                            borderColor: colors.text,
                            transform: [{ translateY: -2 }, { scale: 1.03 }],
                          },
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        {({ hovered }) => (
                          <Text
                            style={[
                              styles.genderChipText,
                              { color: selected ? colors.primary : colors.muted },
                              hovered && { color: colors.text },
                            ]}
                          >
                            {option.label}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.settingHeader}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Age range</Text>
                  <Text style={[styles.settingValue, { color: colors.muted }]}>
                    {filterForm.minAge}-{filterForm.maxAge}
                  </Text>
                </View>
                <Text style={[styles.sliderLabel, { color: colors.muted }]}>Minimum age</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={100}
                  step={1}
                  value={filterForm.minAge}
                  minimumTrackTintColor={colors.primaryStrong}
                  maximumTrackTintColor={colors.borderStrong}
                  thumbTintColor={colors.text}
                  onValueChange={updateMinAge}
                />
                <Text style={[styles.sliderLabel, { color: colors.muted }]}>Maximum age</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={100}
                  step={1}
                  value={filterForm.maxAge}
                  minimumTrackTintColor={colors.primaryStrong}
                  maximumTrackTintColor={colors.borderStrong}
                  thumbTintColor={colors.text}
                  onValueChange={updateMaxAge}
                />
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleText, { color: colors.muted }]}>
                    Show people slightly outside my preferred age range.
                  </Text>
                  <Switch
                    value={filterForm.expandAge}
                    onValueChange={(value) =>
                      setFilterForm((current) => ({
                        ...current,
                        expandAge: value,
                      }))
                    }
                    trackColor={{ false: colors.borderStrong, true: colors.primaryStrong }}
                    thumbColor={colors.text}
                  />
                </View>
              </View>

              <View style={styles.searchFilterBlock}>
                <Text style={[styles.filtersSectionTitle, { color: colors.text }]}>More filters</Text>
                <View style={[styles.searchFilterList, { backgroundColor: colors.surface }]}>
                  {SEARCH_FILTER_IDS.map((filterId) => {
                    const config = SEARCH_FILTER_CONFIGS[filterId];
                    const value = formatSelectionValue(filterForm.advancedFilters?.[filterId]);

                    return (
                      <Pressable
                        key={filterId}
                        style={({ hovered, pressed }) => [
                          styles.searchFilterRow,
                          {
                            borderBottomColor: colors.border,
                          },
                          hovered && {
                            backgroundColor: colors.elevated,
                            transform: [{ translateX: 3 }],
                          },
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => setActiveSearchFilterId(filterId)}
                      >
                        {({ hovered }) => (
                          <>
                            <Text style={[styles.searchFilterIcon, hovered && styles.valueHover]}>
                              {config.icon}
                            </Text>
                            <Text
                              style={[styles.searchFilterLabel, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {config.label}
                            </Text>
                            <Text
                              style={[
                                styles.searchFilterValue,
                                { color: hovered ? colors.text : colors.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {value}
                            </Text>
                            <Text
                              style={[
                                styles.rowChevron,
                                { color: hovered ? colors.text : colors.muted },
                              ]}
                            >
                              {">"}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(activeSearchFilter)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSearchFilterId(null)}
      >
        <View style={[styles.selectorOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable
            style={styles.selectorDismiss}
            onPress={() => setActiveSearchFilterId(null)}
          />
          <View
            style={[
              styles.selectorSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.selectorHeader, { borderBottomColor: colors.border }]}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.selectorHeaderButton,
                  hovered && styles.doneFilterButtonHover,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => updateAdvancedFilter(
                  activeSearchFilterId,
                  activeSearchFilter?.mode === "multi" ? [] : "",
                )}
              >
                <Text style={[styles.selectorClearText, { color: colors.muted }]}>Clear</Text>
              </Pressable>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                {activeSearchFilter?.label}
              </Text>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.selectorHeaderButton,
                  hovered && styles.doneFilterButtonHover,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setActiveSearchFilterId(null)}
              >
                <Text style={[styles.doneFilterText, { color: colors.accent }]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.selectorOptionList}
            >
              {activeSearchFilter?.options.map((option) => {
                const selected = activeSearchSelection.includes(option);

                return (
                  <Pressable
                    key={option}
                    style={({ hovered, pressed }) => [
                      styles.selectorOptionRow,
                      {
                        borderBottomColor: colors.border,
                      },
                      selected && {
                        backgroundColor: colors.primarySoft,
                      },
                      hovered && {
                        backgroundColor: colors.elevatedAlt,
                        transform: [{ translateX: 3 }],
                      },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => toggleAdvancedFilterOption(option)}
                  >
                    <Text
                      style={[
                        styles.selectorOptionText,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {option}
                    </Text>
                    <View
                      style={[
                        styles.selectorCheck,
                        {
                          borderColor: colors.borderStrong,
                          backgroundColor: colors.elevated,
                        },
                        selected && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    >
                      {selected ? <Text style={styles.selectorCheckText}>OK</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1326",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.1,
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,19,38,0.9)",
  },
  hexLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    paddingTop: 80,
    gap: 28,
  },
  hexRow: {
    flexDirection: "row",
    gap: 28,
    transform: [{ translateX: -24 }],
  },
  hexCell: {
    width: 54,
    height: 31,
    borderWidth: 1,
    borderColor: "rgba(192,193,255,0.16)",
    transform: [{ rotate: "30deg" }],
  },
  header: {
    minHeight: 78,
    paddingTop: 14,
    paddingHorizontal: 24,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0b1326",
    borderBottomWidth: 1,
    shadowColor: "#c0c1ff",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  headerDesktop: {
    height: 64,
    minHeight: 64,
    paddingTop: 0,
    paddingBottom: 0,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  stitchLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  logo: {
    color: "#dae2fd",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexShrink: 1,
  },
  playerCopy: {
    alignItems: "flex-end",
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.12)",
  },
  playerName: {
    maxWidth: 150,
    fontSize: 16,
    fontWeight: "900",
  },
  playerLevel: {
    fontSize: 11,
    fontWeight: "800",
  },
  filterButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#171f33",
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#ff5167",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  filterText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 34,
  },
  exploreLayout: {
    width: "100%",
    maxWidth: 1080,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  exploreLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 44,
  },
  swipeColumn: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 18,
    minWidth: 0,
  },
  swipeColumnWide: {
    width: 430,
    paddingTop: 12,
  },
  stackGhostBack: {
    position: "absolute",
    top: 0,
    width: 330,
    height: 440,
    borderRadius: 30,
    backgroundColor: "rgba(6,14,32,0.56)",
    transform: [{ scale: 0.9 }, { translateY: -24 }],
  },
  stackGhostFront: {
    position: "absolute",
    top: 12,
    width: 370,
    height: 470,
    borderRadius: 30,
    backgroundColor: "rgba(23,31,51,0.5)",
    transform: [{ scale: 0.95 }, { translateY: -12 }],
  },
  cardFrame: {
    alignSelf: "center",
    borderRadius: 32,
    shadowColor: "#ff5167",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    zIndex: 2,
  },
  cardFrameHover: {
    shadowColor: "#ff5167",
    shadowOpacity: 0.58,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
    boxShadow: "0 22px 52px rgba(255,81,103,0.52)",
  },
  skeletonCard: {
    flex: 1,
    minHeight: 520,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
    justifyContent: "space-between",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  skeletonBlock: {
    borderRadius: 999,
  },
  skeletonTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  skeletonPillSmall: {
    width: 72,
    height: 28,
  },
  skeletonMatchBadge: {
    width: 62,
    height: 52,
    borderRadius: 18,
  },
  skeletonCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
  },
  skeletonPhotoGlow: {
    width: "86%",
    height: "100%",
    maxHeight: 300,
    minHeight: 220,
    borderRadius: 24,
  },
  skeletonBottom: {
    gap: 11,
  },
  skeletonPill: {
    width: 122,
    height: 34,
  },
  skeletonName: {
    width: "68%",
    height: 42,
    borderRadius: 12,
  },
  skeletonLine: {
    width: "48%",
    height: 18,
    borderRadius: 9,
  },
  skeletonTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skeletonTag: {
    width: 92,
    height: 30,
  },
  skeletonTagShort: {
    width: 64,
    height: 30,
  },
  skeletonPrompt: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonPromptLine: {
    flex: 1,
    height: 20,
    borderRadius: 10,
  },
  skeletonPromptAction: {
    width: 86,
    height: 36,
  },
  banner: {
    position: "absolute",
    zIndex: 4,
    top: 92,
    left: 20,
    right: 20,
    borderRadius: 18,
    backgroundColor: "rgba(23,31,51,0.92)",
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.22)",
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
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(23,31,51,0.7)",
  },
  errorText: {
    color: "#ff4f7b",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 14,
    paddingBottom: 0,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    zIndex: 4,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222a3d",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  nope: {
    borderWidth: 0,
  },
  like: {
    borderWidth: 0,
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ff4f7b",
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
  },
  activityPanel: {
    width: 320,
    minHeight: 560,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 18,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  activityPanelCompact: {
    width: "100%",
    maxWidth: 420,
    minHeight: 0,
    marginTop: 0,
    padding: 16,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
  },
  activityPing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#c0c1ff",
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  activityList: {
    flex: 1,
    gap: 10,
  },
  activityListCompact: { flex: 0, gap: 10 },
  activityItem: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityItemCompact: { flexGrow: 0, minHeight: 84 },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activityIconText: {
    fontSize: 13,
    fontWeight: "900",
  },
  activityCopy: {
    flex: 1,
    minWidth: 0,
  },
  activityItemTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  activityItemDetail: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
  },
  activityTime: {
    fontSize: 11,
    fontWeight: "800",
  },
  filtersOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5,5,6,0.72)",
  },
  filtersBackdrop: {
    flex: 1,
  },
  filtersSheet: {
    maxHeight: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#2b2234",
    backgroundColor: "#050506",
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 58,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: "#2b2626",
  },
  filtersHeader: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "#252020",
    backgroundColor: "#121016",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  headerSide: {
    width: 72,
  },
  filtersTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "500",
    textAlign: "center",
  },
  doneFilterButton: {
    width: 72,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  doneFilterButtonHover: {
    backgroundColor: "rgba(87,184,255,0.16)",
    transform: [{ translateY: -1 }],
  },
  doneFilterText: {
    color: "#57b8ff",
    fontSize: 18,
    fontWeight: "600",
  },
  filtersContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 34,
    gap: 20,
  },
  filtersSectionTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "500",
  },
  discoveryCard: {
    borderRadius: 8,
    backgroundColor: "#121016",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  locationRow: {
    minHeight: 92,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationCopy: {
    flex: 1,
    gap: 8,
  },
  settingTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "400",
  },
  settingHint: {
    color: "#c7b9cf",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  filterMessage: {
    color: "#c7b9cf",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  locationValue: {
    maxWidth: 138,
    color: "#cbbdd2",
    fontSize: 22,
    fontWeight: "400",
    textAlign: "right",
  },
  rowChevron: {
    color: "#cbbdd2",
    fontSize: 34,
    fontWeight: "300",
  },
  valueHover: {
    color: "#ffffff",
  },
  divider: {
    height: 1,
    backgroundColor: "#33283d",
    marginVertical: 18,
  },
  settingHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  settingValue: {
    flexShrink: 1,
    color: "#ddd0e5",
    fontSize: 22,
    fontWeight: "400",
    textAlign: "right",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 14,
  },
  toggleText: {
    flex: 1,
    color: "#c7b9cf",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "500",
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  genderChip: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#403449",
    backgroundColor: "#221a29",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  genderChipText: {
    color: "#ddd0e5",
    fontSize: 16,
    fontWeight: "800",
  },
  sliderLabel: {
    color: "#c7b9cf",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  searchFilterBlock: {
    gap: 12,
  },
  searchFilterList: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#121016",
  },
  searchFilterRow: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#2c2334",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  searchFilterIcon: {
    width: 42,
    color: "#cbbdd2",
    fontSize: 11,
    fontWeight: "900",
  },
  searchFilterLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  searchFilterValue: {
    maxWidth: 116,
    color: "#ddd0e5",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,6,0.68)",
    justifyContent: "flex-end",
  },
  selectorDismiss: {
    flex: 1,
  },
  selectorSheet: {
    maxHeight: "74%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#2b2234",
    backgroundColor: "#121016",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  selectorHeader: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorHeaderButton: {
    width: 72,
    minHeight: 44,
    borderRadius: 999,
    justifyContent: "center",
  },
  selectorClearText: {
    color: "#cbbdd2",
    fontSize: 16,
    fontWeight: "700",
  },
  selectorTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  selectorOptionList: {
    gap: 8,
    paddingVertical: 12,
  },
  selectorOptionRow: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#403449",
    backgroundColor: "#1c1720",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  selectorOptionText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    paddingRight: 12,
  },
  selectorCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#74677d",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorCheckText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  cancelActionIcon: {
    width: 16,
    height: 16,
    tintColor: "#ffb4ab",
  },
  likeGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  heartActionIcon: {
    width: 25,
    height: 23,
    tintColor: "#680019",
  },
});
