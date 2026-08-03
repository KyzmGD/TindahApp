import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

function TindahLogo({ color }) {
  return (
    <View style={styles.brandMark} accessible={false}>
      <View style={[styles.brandEnvelope, { borderColor: color }]}>
        <View style={[styles.brandEnvelopeLine, styles.brandEnvelopeLineLeft, { backgroundColor: color }]} />
        <View style={[styles.brandEnvelopeLine, styles.brandEnvelopeLineRight, { backgroundColor: color }]} />
        <Text style={[styles.brandHeart, { color }]}>{"\u2665"}</Text>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const { user, updateProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
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
  const cardFrameStyle = useMemo(() => {
    const isWide = viewportWidth >= 768;
    const horizontalSpace = isWide ? 96 : 34;
    const maxWidth = isWide ? 430 : 372;
    const minHeight = isWide ? 470 : 410;
    const maxHeight = isWide ? 585 : 540;

    return {
      width: Math.min(Math.max(viewportWidth - horizontalSpace, 288), maxWidth),
      height: Math.min(Math.max(viewportHeight * 0.58, minHeight), maxHeight),
    };
  }, [viewportHeight, viewportWidth]);

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
  setShowMatchModal(false);

  navigation.navigate(
    "Chat",
    {
      match: matchedMatch,
      user: matchedUser,
    }
  );
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
    }
  } catch (swipeError) {
    setUsers((current) => [user, ...current]);
    setRemaining((current) => current + 1);
    setError(swipeError.message);
  }
};

  return (
    <ImageBackground
      source={EXPLORE_BACKGROUND}
      style={[styles.screen, { backgroundColor: colors.screen }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.backgroundTint} />
      <View
        style={[
          styles.header,
          {
            backgroundColor: "rgba(14,10,17,0.82)",
            borderBottomColor: "rgba(255,255,255,0.08)",
          },
        ]}
      >
        <View style={styles.brand}>
          <TindahLogo color={colors.primary} />
          <Text style={[styles.logo, { color: colors.primary }]}>Tindah</Text>
        </View>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.filterButton,
            {
              backgroundColor: "rgba(32,24,38,0.78)",
              borderColor: "rgba(255,255,255,0.1)",
            },
            hovered && {
              backgroundColor: "rgba(255,79,123,0.18)",
              borderColor: colors.accent,
              transform: [{ translateY: -1 }],
            },
            pressed && styles.buttonPressed,
          ]}
          onPress={openFilters}
        >
          <Text style={[styles.filterText, { color: colors.text }]}>Filters</Text>
        </Pressable>
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
                  transform: [{ translateY: -1 }],
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={refresh}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.cardFrame, cardFrameStyle]}>
            <CardStack
              users={users}
              remaining={remaining}
              onNope={(user) => handleSwipe(user, "nope")}
              onLike={(user) => handleSwipe(user, "like")}
              onSuperLike={(user) => handleSwipe(user, "superlike")}
            />
          </View>
        )}
      </ScrollView>
      <MatchModal
  visible={showMatchModal}
  currentUser={null}
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
      <View style={styles.actions}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.actionButton,
            styles.nope,
            {
              backgroundColor: colors.elevated,
              shadowColor: colors.shadow,
            },
            hovered && {
              backgroundColor: colors.elevatedAlt,
              transform: [{ translateY: -2 }, { scale: 1.04 }],
            },
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
            {
              backgroundColor: colors.elevated,
              shadowColor: colors.shadow,
            },
            hovered && {
              backgroundColor: colors.elevatedAlt,
              transform: [{ translateY: -2 }, { scale: 1.04 }],
            },
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
            {
              backgroundColor: colors.elevated,
              shadowColor: colors.shadow,
            },
            hovered && {
              backgroundColor: colors.elevatedAlt,
              transform: [{ translateY: -2 }, { scale: 1.04 }],
            },
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050506",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,6,0.34)",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#121016",
    borderBottomWidth: 1,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 38,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  brandEnvelope: {
    width: 34,
    height: 25,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,79,123,0.08)",
    overflow: "hidden",
    transform: [{ rotate: "-2deg" }],
  },
  brandEnvelopeLine: {
    position: "absolute",
    width: 24,
    height: 2,
    top: 7,
    opacity: 0.9,
  },
  brandEnvelopeLineLeft: {
    left: -3,
    transform: [{ rotate: "31deg" }],
  },
  brandEnvelopeLineRight: {
    right: -3,
    transform: [{ rotate: "-31deg" }],
  },
  brandHeart: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 15,
  },
  logo: {
    color: "#ff4f7b",
    fontSize: 30,
    fontWeight: "900",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#1c1720",
    borderRadius: 18,
    borderWidth: 1,
  },
  filterButtonHover: {
    backgroundColor: "#2a2133",
    transform: [{ translateY: -1 }],
  },
  filterText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  cardFrame: {
    alignSelf: "center",
    borderRadius: 28,
    shadowColor: "#ff4f7b",
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 9,
  },
  loading: {
    flex: 1,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
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
    top: 120,
    left: 20,
    right: 20,
    borderRadius: 18,
    backgroundColor: "#1c1720",
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
    color: "#ff4f7b",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "transparent",
    borderTopWidth: 0,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1720",
    shadowColor: "#050506",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionHover: {
    backgroundColor: "#2a2133",
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
    borderColor: "#20c7ff",
  },
  like: {
    borderWidth: 1,
    borderColor: "#ff2f6d",
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ff4f7b",
  },
  retryButtonHover: {
    backgroundColor: "#ff7aa2",
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
  locationRowHover: {
    backgroundColor: "#231b2b",
    transform: [{ translateX: 4 }],
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
  genderChipSelected: {
    borderColor: "#ff4f7b",
    backgroundColor: "#321827",
  },
  genderChipHover: {
    borderColor: "#ffffff",
    backgroundColor: "#2f2440",
    transform: [{ translateY: -2 }, { scale: 1.03 }],
  },
  genderChipText: {
    color: "#ddd0e5",
    fontSize: 16,
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#ff4f7b",
  },
  genderChipTextHover: {
    color: "#ffffff",
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
  searchFilterRowHover: {
    backgroundColor: "#231b2b",
    transform: [{ translateX: 4 }],
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
  selectorOptionRowSelected: {
    borderColor: "#ff4f7b",
    backgroundColor: "#321827",
  },
  selectorOptionRowHover: {
    borderColor: "#20c7ff",
    backgroundColor: "#231b2b",
  },
  selectorOptionText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    paddingRight: 12,
  },
  selectorOptionTextSelected: {
    color: "#ff7aa2",
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
  selectorCheckSelected: {
    borderColor: "#ff4f7b",
    backgroundColor: "#ff4f7b",
  },
  selectorCheckText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  nopeText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  superLikeText: {
    color: "#20c7ff",
    fontSize: 30,
    fontWeight: "900",
  },
  likeText: {
    color: "#ff2f6d",
    fontSize: 32,
    fontWeight: "900",
  },
});
