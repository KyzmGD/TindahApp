import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import CardStack from "../components/swipe/CardStack";
import { discover, sendSwipe } from "../services/swipe.api";
import MatchModal from "../components/common/MatchModal";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

const GENDER_OPTIONS = [
  { label: "Women", value: "woman" },
  { label: "Men", value: "man" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Other", value: "other" },
];
const ALL_GENDER_VALUES = GENDER_OPTIONS.map((option) => option.value);

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function getFilterForm(user) {
  const preferences = user?.preferences || {};
  const ageRange = preferences.ageRange || {};

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
  };
}

export default function ExploreScreen() {
  const { user, updateProfile } = useAuth();
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
  const [filterForm, setFilterForm] = useState(() => getFilterForm(user));
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
      });
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
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>tindah</Text>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.filterButton,
            hovered && styles.filterButtonHover,
            pressed && styles.buttonPressed,
          ]}
          onPress={openFilters}
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
      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilters}
      >
        <View style={styles.filtersOverlay}>
          <Pressable style={styles.filtersBackdrop} onPress={closeFilters} />
          <View style={styles.filtersSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.filtersHeader}>
              <View style={styles.headerSide} />
              <Text style={styles.filtersTitle}>Search settings</Text>
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
                  <ActivityIndicator color="#4c9dff" />
                ) : (
                  <Text style={styles.doneFilterText}>Done</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <Text style={styles.filtersSectionTitle}>Discovery</Text>

              <View style={styles.discoveryCard}>
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.locationRow,
                    hovered && styles.locationRowHover,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={useCurrentLocation}
                  disabled={locating}
                >
                  {({ hovered }) => (
                    <>
                      <View style={styles.locationCopy}>
                        <Text style={styles.settingTitle}>Location</Text>
                        <Text style={styles.settingHint}>
                          Change where matches are discovered.
                        </Text>
                      </View>
                      <Text style={[styles.locationValue, hovered && styles.valueHover]}>
                        {locating ? "Locating..." : "Use current location"}
                      </Text>
                      <Text style={[styles.rowChevron, hovered && styles.valueHover]}>
                        {">"}
                      </Text>
                    </>
                  )}
                </Pressable>
                {filterMessage ? (
                  <Text style={styles.filterMessage}>{filterMessage}</Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.settingHeader}>
                  <Text style={styles.settingTitle}>Maximum distance</Text>
                  <Text style={styles.settingValue}>{filterForm.maxDistanceKm} km</Text>
                </View>
                <Slider
                  minimumValue={2}
                  maximumValue={100}
                  step={1}
                  value={filterForm.maxDistanceKm}
                  minimumTrackTintColor="#ff253a"
                  maximumTrackTintColor="#6c6363"
                  thumbTintColor="#ffffff"
                  onValueChange={(value) =>
                    setFilterForm((current) => ({
                      ...current,
                      maxDistanceKm: Math.round(value),
                    }))
                  }
                />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>
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
                    trackColor={{ false: "#5e5a5a", true: "#e91515" }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingHeader}>
                  <Text style={styles.settingTitle}>Interested in</Text>
                  <Text style={styles.settingValue} numberOfLines={1}>
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
                          selected && styles.genderChipSelected,
                          hovered && styles.genderChipHover,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        {({ hovered }) => (
                          <Text
                            style={[
                              styles.genderChipText,
                              selected && styles.genderChipTextSelected,
                              hovered && styles.genderChipTextHover,
                            ]}
                          >
                            {option.label}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <View style={styles.settingHeader}>
                  <Text style={styles.settingTitle}>Age range</Text>
                  <Text style={styles.settingValue}>
                    {filterForm.minAge}-{filterForm.maxAge}
                  </Text>
                </View>
                <Text style={styles.sliderLabel}>Minimum age</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={100}
                  step={1}
                  value={filterForm.minAge}
                  minimumTrackTintColor="#ff253a"
                  maximumTrackTintColor="#6c6363"
                  thumbTintColor="#ffffff"
                  onValueChange={updateMinAge}
                />
                <Text style={styles.sliderLabel}>Maximum age</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={100}
                  step={1}
                  value={filterForm.maxAge}
                  minimumTrackTintColor="#ff253a"
                  maximumTrackTintColor="#6c6363"
                  thumbTintColor="#ffffff"
                  onValueChange={updateMaxAge}
                />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>
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
                    trackColor={{ false: "#5e5a5a", true: "#e91515" }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              <View style={styles.advancedBlock}>
                <View style={styles.advancedTitleRow}>
                  <Text style={styles.filtersSectionTitle}>Advanced search</Text>
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldBadgeText}>GOLD</Text>
                  </View>
                </View>
                <Text style={styles.advancedText}>
                  Extra preferences can help rank better profiles, but they will
                  not completely hide everyone else.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  filtersOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  filtersBackdrop: {
    flex: 1,
  },
  filtersSheet: {
    maxHeight: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#201b1b",
    backgroundColor: "#000000",
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
    backgroundColor: "#101010",
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
    backgroundColor: "rgba(76,157,255,0.12)",
    transform: [{ translateY: -1 }],
  },
  doneFilterText: {
    color: "#4c9dff",
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
    backgroundColor: "#101010",
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
    backgroundColor: "#171313",
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
    color: "#b9b1b1",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  filterMessage: {
    color: "#b9b1b1",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  locationValue: {
    maxWidth: 138,
    color: "#bfb8b8",
    fontSize: 22,
    fontWeight: "400",
    textAlign: "right",
  },
  rowChevron: {
    color: "#bfb8b8",
    fontSize: 34,
    fontWeight: "300",
  },
  valueHover: {
    color: "#ffffff",
  },
  divider: {
    height: 1,
    backgroundColor: "#292424",
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
    color: "#c8c0c0",
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
    color: "#b9b1b1",
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
    borderColor: "#3a3434",
    backgroundColor: "#211d1d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  genderChipSelected: {
    borderColor: "#ff4458",
    backgroundColor: "#2a171b",
  },
  genderChipHover: {
    borderColor: "#ffffff",
    backgroundColor: "#2b2525",
    transform: [{ translateY: -2 }, { scale: 1.03 }],
  },
  genderChipText: {
    color: "#c8c0c0",
    fontSize: 16,
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#ff4458",
  },
  genderChipTextHover: {
    color: "#ffffff",
  },
  sliderLabel: {
    color: "#b9b1b1",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  advancedBlock: {
    paddingHorizontal: 2,
    gap: 10,
  },
  advancedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goldBadge: {
    borderRadius: 999,
    backgroundColor: "#f6c90e",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goldBadgeText: {
    color: "#211400",
    fontSize: 13,
    fontWeight: "900",
  },
  advancedText: {
    color: "#b9b1b1",
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "500",
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
