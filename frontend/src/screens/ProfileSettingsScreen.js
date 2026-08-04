import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useAuth } from "../context/AuthContext";
import { uploadProfileImage } from "../services/upload.api";

const MAX_PHOTOS = 6;
const MIN_DISTANCE_KM = 2;
const MAX_DISTANCE_KM = 100;
const MIN_AGE = 18;
const MAX_AGE = 100;
const SCREEN_PADDING = 18;
const CONTENT_PADDING = 18;
const PHOTO_GAP = 8;

const DETAIL_CONFIGS = {
  interests: {
    icon: "TAG",
    label: "Interests",
    mode: "multi",
    options: [
      "Football",
      "Gaming",
      "Surfing",
      "Travel",
      "Coffee",
      "Music",
      "Movies",
      "Gym",
      "Photography",
      "Cooking",
      "Dancing",
      "Reading",
      "Hiking",
      "Karaoke",
      "Art",
      "Technology",
      "Basketball",
      "Yoga",
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
    options: [
      "English",
      "Vietnamese",
      "Korean",
      "Japanese",
      "Chinese",
      "French",
      "Spanish",
      "Thai",
    ],
  },
  zodiac: {
    icon: "MOON",
    label: "Zodiac",
    mode: "single",
    options: [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ],
  },
  education: {
    icon: "EDU",
    label: "Education",
    mode: "single",
    options: [
      "High school",
      "College",
      "Bachelor's degree",
      "Master's degree",
      "PhD",
      "Trade school",
      "Prefer not to say",
    ],
  },
  family: {
    icon: "FAM",
    label: "Family plans",
    mode: "single",
    options: [
      "Want children",
      "Open to children",
      "Do not want children",
      "Have children",
      "Not sure yet",
    ],
  },
  communication: {
    icon: "CHAT",
    label: "Communication style",
    mode: "single",
    options: [
      "Big texter",
      "Phone caller",
      "Video chatter",
      "Better in person",
      "Slow replies",
    ],
  },
  love: {
    icon: "LOVE",
    label: "Love language",
    mode: "single",
    options: [
      "Quality time",
      "Words of affirmation",
      "Physical touch",
      "Acts of service",
      "Receiving gifts",
    ],
  },
  pets: {
    icon: "PET",
    label: "Pets",
    mode: "multi",
    options: [
      "Dog",
      "Cat",
      "Fish",
      "Bird",
      "Reptile",
      "No pets",
      "Want pets",
      "Pet-free",
    ],
  },
  drinking: {
    icon: "BAR",
    label: "Drinking",
    mode: "single",
    options: [
      "Not for me",
      "Sober",
      "On special occasions",
      "Socially on weekends",
      "Most nights",
    ],
  },
  smoking: {
    icon: "SMK",
    label: "Smoking",
    mode: "single",
    options: [
      "Non-smoker",
      "Social smoker",
      "Smoker",
      "Trying to quit",
      "Prefer not to say",
    ],
  },
  workout: {
    icon: "FIT",
    label: "Workout",
    mode: "single",
    options: [
      "Every day",
      "Often",
      "Sometimes",
      "Almost never",
      "Prefer not to say",
    ],
  },
  social: {
    icon: "@",
    label: "Social media",
    mode: "single",
    options: [
      "Influencer",
      "Very active",
      "Socially active",
      "Passive scroller",
      "Off the grid",
    ],
  },
};

const DETAIL_ROW_IDS = [
  "interests",
  "looking",
  "languages",
  "zodiac",
  "education",
  "family",
  "communication",
  "love",
  "pets",
  "drinking",
  "smoking",
  "workout",
  "social",
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizePhotos(photos = []) {
  return photos.slice(0, MAX_PHOTOS).map((photo, index) => ({
    url: photo.url,
    publicId: photo.publicId || null,
    isPrimary: index === 0,
  }));
}

function buildPhotoSlots(photos) {
  const slots = normalizePhotos(photos).map((photo) => ({
    ...photo,
    key: `photo:${photo.publicId || photo.url}`,
    type: "photo",
  }));

  while (slots.length < MAX_PHOTOS) {
    slots.push({
      key: `empty:${slots.length}`,
      type: "empty",
    });
  }

  return slots;
}

function getInitialProfileDetails(user) {
  const profileDetails = user?.profileDetails || {};

  return {
    interests: user?.interests || [],
    looking: profileDetails.looking || "",
    languages: profileDetails.languages || [],
    zodiac: profileDetails.zodiac || "",
    education: profileDetails.education || user?.school || "",
    family: profileDetails.family || "",
    communication: profileDetails.communication || "",
    love: profileDetails.love || "",
    pets: profileDetails.pets || [],
    drinking: profileDetails.drinking || "",
    smoking: profileDetails.smoking || "",
    workout: profileDetails.workout || "",
    social: profileDetails.social || "",
  };
}

function getSettingsFromUser(user) {
  const bio = user?.bio || "";

  return {
    maxDistanceKm: clamp(
      Number(user?.preferences?.maxDistanceKm || 50),
      MIN_DISTANCE_KM,
      MAX_DISTANCE_KM,
    ),
    minAge: clamp(Number(user?.preferences?.ageRange?.min || 18), MIN_AGE, MAX_AGE),
    maxAge: clamp(Number(user?.preferences?.ageRange?.max || 60), MIN_AGE, MAX_AGE),
    photos: normalizePhotos(user?.photos),
    includeBio: Boolean(bio.trim()),
    bio,
    profileDetails: getInitialProfileDetails(user),
  };
}

function normalizeSelection(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function formatSelectionValue(value) {
  const selected = normalizeSelection(value);

  if (!selected.length) {
    return "Select";
  }

  if (selected.length <= 2) {
    return selected.join(", ");
  }

  return `${selected.length} selected`;
}

export function buildProfileSettingsPayload(settings) {
  const profileDetails = settings.profileDetails || {};

  return {
    maxDistanceKm: settings.maxDistanceKm,
    minAge: settings.minAge,
    maxAge: settings.maxAge,
    photos: normalizePhotos(settings.photos),
    bio: settings.includeBio ? settings.bio.trim() : "",
    interests: normalizeSelection(settings.profileDetails?.interests).slice(0, 20),
    profileDetails: {
      looking: profileDetails.looking || "",
      languages: normalizeSelection(profileDetails.languages),
      zodiac: profileDetails.zodiac || "",
      education: profileDetails.education || "",
      family: profileDetails.family || "",
      communication: profileDetails.communication || "",
      love: profileDetails.love || "",
      pets: normalizeSelection(profileDetails.pets),
      drinking: profileDetails.drinking || "",
      smoking: profileDetails.smoking || "",
      workout: profileDetails.workout || "",
      social: profileDetails.social || "",
    },
  };
}

export default function ProfileSettingsScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [settings, setSettings] = useState(() => getSettingsFromUser(user));
  const [photoGridWidth, setPhotoGridWidth] = useState(0);
  const [activeDetailId, setActiveDetailId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const allowLeaveRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    setSettings(getSettingsFromUser(user));
  }, [user]);

  const photoSlots = useMemo(() => buildPhotoSlots(settings.photos), [settings.photos]);
  const photoSize = useMemo(() => {
    const fallbackWidth = windowWidth - SCREEN_PADDING * 2 - CONTENT_PADDING * 2;
    const availableWidth = photoGridWidth || fallbackWidth;
    return Math.max(72, Math.floor((availableWidth - PHOTO_GAP * 2) / 3));
  }, [photoGridWidth, windowWidth]);

  const handlePhotoGridLayout = useCallback((event) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    setPhotoGridWidth((currentWidth) => (
      Math.abs(currentWidth - nextWidth) < 1 ? currentWidth : nextWidth
    ));
  }, []);
  const savedPayload = useMemo(
    () => buildProfileSettingsPayload(getSettingsFromUser(user)),
    [user],
  );
  const currentPayload = useMemo(
    () => buildProfileSettingsPayload(settings),
    [settings],
  );
  const hasChanges = useMemo(
    () => JSON.stringify(savedPayload) !== JSON.stringify(currentPayload),
    [currentPayload, savedPayload],
  );
  const activeConfig = activeDetailId ? DETAIL_CONFIGS[activeDetailId] : null;
  const activeSelection = activeDetailId
    ? settings.profileDetails?.[activeDetailId]
    : null;

  const profileRows = useMemo(
    () =>
      DETAIL_ROW_IDS.map((id) => ({
        id,
        ...DETAIL_CONFIGS[id],
        value: formatSelectionValue(settings.profileDetails?.[id]),
      })),
    [settings.profileDetails],
  );

  const completionPercent = useMemo(() => {
    const completed = [
      Boolean(user?.name),
      Boolean(currentPayload.bio),
      Boolean(settings.profileDetails?.interests?.length),
      Boolean(settings.photos.length),
      Boolean(settings.profileDetails?.education),
      Boolean(settings.profileDetails?.looking),
    ].filter(Boolean).length;

    return Math.round((completed / 6) * 100);
  }, [currentPayload.bio, settings.photos.length, settings.profileDetails, user]);

  const saveAndLeave = useCallback(async (action) => {
    if (uploading) {
      setMessage("Please wait until the photo upload finishes.");
      return;
    }

    if (!hasChanges) {
      allowLeaveRef.current = true;
      navigation.dispatch(action);
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      setMessage("Saving settings...");
      await updateProfile(currentPayload);
      allowLeaveRef.current = true;
      navigation.dispatch(action);
    } catch (error) {
      setMessage(error.message || "Could not save settings.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [currentPayload, hasChanges, navigation, updateProfile, uploading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowLeaveRef.current || !hasChanges) {
        return;
      }

      event.preventDefault();

      if (savingRef.current) {
        return;
      }

      saveAndLeave(event.data.action);
    });

    return unsubscribe;
  }, [hasChanges, navigation, saveAndLeave]);

  const updateSetting = (key, value) => {
    setMessage("");
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateProfileDetail = (detailId, value) => {
    setMessage("");
    setSettings((current) => ({
      ...current,
      profileDetails: {
        ...current.profileDetails,
        [detailId]: value,
      },
    }));
  };

  const toggleDetailOption = (option) => {
    if (!activeDetailId || !activeConfig) {
      return;
    }

    if (activeConfig.mode === "multi") {
      const selected = normalizeSelection(activeSelection);
      const nextSelection = selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option];

      updateProfileDetail(activeDetailId, nextSelection);
      return;
    }

    updateProfileDetail(activeDetailId, option);
  };

  const updateMinAge = (value) => {
    const nextMinAge = Math.round(value);
    setMessage("");
    setSettings((current) => ({
      ...current,
      minAge: nextMinAge,
      maxAge: Math.max(current.maxAge, nextMinAge),
    }));
  };

  const updateMaxAge = (value) => {
    const nextMaxAge = Math.round(value);
    setMessage("");
    setSettings((current) => ({
      ...current,
      minAge: Math.min(current.minAge, nextMaxAge),
      maxAge: nextMaxAge,
    }));
  };

  const toggleBio = (value) => {
    setMessage("");
    setSettings((current) => ({
      ...current,
      includeBio: value,
    }));
  };

  const pickPhoto = async () => {
    if (settings.photos.length >= MAX_PHOTOS || uploading) {
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });

      if (result.canceled) {
        return;
      }

      const uploadedImage = await uploadProfileImage(result.assets[0]);

      setSettings((current) => ({
        ...current,
        photos: normalizePhotos([
          ...current.photos,
          {
            url: uploadedImage.url,
            publicId: uploadedImage.publicId,
          },
        ]),
      }));
      setMessage(
        uploadedImage.storage === "cloudinary"
          ? "Photo uploaded to Cloudinary. Tap Done to save."
          : "Photo uploaded locally. Tap Done to save.",
      );
    } catch (error) {
      setMessage(error.message || "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoUrl) => {
    setMessage("");
    setSettings((current) => ({
      ...current,
      photos: normalizePhotos(current.photos.filter((photo) => photo.url !== photoUrl)),
    }));
  };

  const handleDragEnd = ({ data }) => {
    setMessage("");
    setSettings((current) => ({
      ...current,
      photos: normalizePhotos(data.filter((item) => item.type === "photo")),
    }));
  };

  const renderPhotoSlot = ({ item, drag, isActive, getIndex, index }) => {
    const itemIndex = typeof index === "number" ? index : getIndex?.() || 0;
    const isLastColumn = itemIndex % 3 === 2;
    const slotSpacing = {
      width: photoSize,
      marginRight: isLastColumn ? 0 : PHOTO_GAP,
    };

    return (
      <ScaleDecorator activeScale={1.04}>
        {item.type === "photo" ? (
          <Pressable
            disabled={isActive}
            onLongPress={drag}
            delayLongPress={180}
            style={({ hovered, pressed }) => [
              styles.photoSlot,
              slotSpacing,
              hovered && styles.photoSlotHover,
              pressed && styles.photoSlotPressed,
              isActive && styles.photoSlotActive,
            ]}
          >
            <Image source={{ uri: item.url }} style={styles.photo} />
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>
                {item.isPrimary ? "Primary" : "Hold"}
              </Text>
            </View>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.removeButton,
                hovered && styles.removeButtonHover,
                pressed && styles.removeButtonPressed,
              ]}
              onPress={() => removePhoto(item.url)}
            >
              <Text style={styles.removeButtonText}>x</Text>
            </Pressable>
          </Pressable>
        ) : (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.emptySlot,
              slotSpacing,
              hovered && styles.emptySlotHover,
              pressed && styles.emptySlotPressed,
            ]}
            onPress={pickPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#ff4f7b" />
            ) : (
              <>
                <Text style={styles.emptyPlus}>+</Text>
                <Text style={styles.emptyLabel}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </ScaleDecorator>
    );
  };

  const renderSettingRow = (row) => (
    <Pressable
      key={row.id}
      style={({ hovered, pressed }) => [
        styles.detailRow,
        hovered && styles.detailRowHover,
        pressed && styles.detailRowPressed,
      ]}
      onPress={() => setActiveDetailId(row.id)}
    >
      {({ hovered }) => (
        <>
          <View style={styles.rowIcon}>
            <Text style={[styles.rowIconText, hovered && styles.rowIconTextHover]}>
              {row.icon}
            </Text>
          </View>
          <Text
            style={[styles.rowLabel, hovered && styles.rowLabelHover]}
            numberOfLines={1}
          >
            {row.label}
          </Text>
          <Text
            style={[styles.rowValue, hovered && styles.rowValueHover]}
            numberOfLines={1}
          >
            {row.value}
          </Text>
          <Text style={[styles.chevron, hovered && styles.chevronHover]}>
            {">"}
          </Text>
        </>
      )}
    </Pressable>
  );

  const renderSelector = () => {
    if (!activeConfig) {
      return null;
    }

    const selected = normalizeSelection(activeSelection);

    return (
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(activeConfig)}
        onRequestClose={() => setActiveDetailId(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setActiveDetailId(null)}
          />
          <View style={styles.selectorSheet}>
            <View style={styles.selectorHeader}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.selectorHeaderButton,
                  hovered && styles.selectorHeaderButtonHover,
                  pressed && styles.selectorHeaderButtonPressed,
                ]}
                onPress={() => {
                  updateProfileDetail(
                    activeDetailId,
                    activeConfig.mode === "multi" ? [] : "",
                  );
                }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Text style={styles.selectorTitle}>{activeConfig.label}</Text>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.selectorHeaderButton,
                  hovered && styles.selectorHeaderButtonHover,
                  pressed && styles.selectorHeaderButtonPressed,
                ]}
                onPress={() => setActiveDetailId(null)}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
            <Text style={styles.selectorHint}>
              {activeConfig.mode === "multi"
                ? "Choose all that apply."
                : "Choose one option."}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionList}
            >
              {activeConfig.options.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <Pressable
                    key={option}
                    style={({ hovered, pressed }) => [
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      hovered && styles.optionRowHover,
                      pressed && styles.optionRowPressed,
                    ]}
                    onPress={() => toggleDetailOption(option)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected ? <Text style={styles.checkText}>OK</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topHandle} />
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Settings</Text>
        <Pressable
          disabled={saving}
          onPress={() => navigation.goBack()}
          style={({ hovered, pressed }) => [
            styles.doneButton,
            hovered && styles.doneButtonHover,
            pressed && styles.doneButtonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#57b8ff" />
          ) : (
            <Text style={styles.doneText}>Done</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.completionBlock}>
          <View style={styles.completionTrack}>
            <View
              style={[
                styles.completionFill,
                { width: `${completionPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.completionText}>
            Complete your profile {completionPercent}% so more people can discover you.
          </Text>
        </View>

        <View style={styles.section} onLayout={handlePhotoGridLayout}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile photos</Text>
            <Text style={styles.valueText}>{settings.photos.length}/6</Text>
          </View>
          <Text style={styles.helperText}>Hold and drag photos to reorder your profile.</Text>
          <DraggableFlatList
            data={photoSlots}
            keyExtractor={(item) => item.key}
            numColumns={3}
            scrollEnabled={false}
            activationDistance={8}
            containerStyle={styles.photoGrid}
            renderItem={renderPhotoSlot}
            onDragEnd={handleDragEnd}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.bioHeader}>
            <Text style={styles.sectionTitle}>Show bio</Text>
            <Switch
              value={settings.includeBio}
              onValueChange={toggleBio}
              trackColor={{ false: "#61556b", true: "#ff4f7b" }}
              thumbColor="#ffffff"
            />
          </View>
          {settings.includeBio ? (
            <TextInput
              value={settings.bio}
              onChangeText={(value) => updateSetting("bio", value)}
              placeholder="Add a short introduction"
              placeholderTextColor="#8f8398"
              multiline
              maxLength={500}
              style={styles.bioInput}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maximum distance</Text>
            <Text style={styles.valueText}>{settings.maxDistanceKm} km</Text>
          </View>
          <Slider
            minimumValue={MIN_DISTANCE_KM}
            maximumValue={MAX_DISTANCE_KM}
            step={1}
            value={settings.maxDistanceKm}
            minimumTrackTintColor="#ff4f7b"
            maximumTrackTintColor="#403449"
            thumbTintColor="#ffffff"
            onValueChange={(value) => updateSetting("maxDistanceKm", Math.round(value))}
          />
          <View style={styles.sliderBounds}>
            <Text style={styles.boundText}>2 km</Text>
            <Text style={styles.boundText}>100 km</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Age range</Text>
            <Text style={styles.valueText}>
              {settings.minAge} - {settings.maxAge}
            </Text>
          </View>
          <Text style={styles.sliderLabel}>Minimum age</Text>
          <Slider
            minimumValue={MIN_AGE}
            maximumValue={MAX_AGE}
            step={1}
            value={settings.minAge}
            minimumTrackTintColor="#ff4f7b"
            maximumTrackTintColor="#403449"
            thumbTintColor="#ffffff"
            onValueChange={updateMinAge}
          />
          <Text style={styles.sliderLabel}>Maximum age</Text>
          <Slider
            minimumValue={MIN_AGE}
            maximumValue={MAX_AGE}
            step={1}
            value={settings.maxAge}
            minimumTrackTintColor="#ff4f7b"
            maximumTrackTintColor="#403449"
            thumbTintColor="#ffffff"
            onValueChange={updateMaxAge}
          />
        </View>

        <View style={styles.listSection}>
          {profileRows.map(renderSettingRow)}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>

      {renderSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050506",
    paddingHorizontal: 18,
    paddingTop: 44,
  },
  topHandle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1c1720",
    marginBottom: 10,
  },
  header: {
    minHeight: 72,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#2c2334",
    backgroundColor: "#121016",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  headerSpacer: {
    width: 64,
  },
  title: {
    flex: 1,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "500",
    textAlign: "center",
  },
  doneButton: {
    width: 64,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  doneButtonHover: {
    backgroundColor: "rgba(87,184,255,0.16)",
    transform: [{ translateY: -1 }],
  },
  doneButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  doneText: {
    color: "#57b8ff",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    backgroundColor: "#121016",
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: 36,
  },
  completionBlock: {
    paddingVertical: 18,
    gap: 12,
  },
  completionTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#2c2334",
  },
  completionFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#ff2f6d",
  },
  completionText: {
    color: "#cbbdd2",
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: "#2c2334",
    paddingVertical: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "500",
  },
  valueText: {
    color: "#ddd0e5",
    fontSize: 17,
    fontWeight: "500",
  },
  helperText: {
    color: "#a79aaa",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
  },
  photoGrid: {
    width: "100%",
    minHeight: 268,
    overflow: "hidden",
  },
  photoSlot: {
    aspectRatio: 0.78,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#231b2b",
    marginBottom: PHOTO_GAP,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  photoSlotActive: {
    opacity: 0.86,
  },
  photoSlotHover: {
    borderColor: "#ffffff",
    shadowColor: "#ffffff",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    transform: [{ translateY: -3 }, { scale: 1.015 }],
  },
  photoSlotPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 6,
    backgroundColor: "rgba(5,5,6,0.72)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  photoBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,6,0.72)",
  },
  removeButtonHover: {
    backgroundColor: "#ff4f7b",
    transform: [{ scale: 1.08 }],
  },
  removeButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.94 }],
  },
  removeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  emptySlot: {
    aspectRatio: 0.78,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4b3d56",
    backgroundColor: "#231b2b",
    marginBottom: PHOTO_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlotHover: {
    borderColor: "#ffffff",
    backgroundColor: "#33273d",
    shadowColor: "#ffffff",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    transform: [{ translateY: -3 }, { scale: 1.015 }],
  },
  emptySlotPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  emptyPlus: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },
  emptyLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  bioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bioInput: {
    minHeight: 104,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    backgroundColor: "#1c1720",
    borderWidth: 1,
    borderColor: "#33273d",
    fontSize: 16,
    textAlignVertical: "top",
  },
  sliderBounds: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  boundText: {
    color: "#a79aaa",
    fontSize: 13,
    fontWeight: "700",
  },
  sliderLabel: {
    color: "#b6a9ba",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  listSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#2c2334",
  },
  detailRow: {
    minHeight: 66,
    borderTopWidth: 1,
    borderTopColor: "#2c2334",
    flexDirection: "row",
    alignItems: "center",
  },
  detailRowHover: {
    backgroundColor: "#231b2b",
    paddingHorizontal: 8,
    transform: [{ translateX: 4 }],
  },
  detailRowPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  rowIcon: {
    width: 58,
  },
  rowIconText: {
    color: "#cbbdd2",
    fontSize: 12,
    fontWeight: "900",
  },
  rowIconTextHover: {
    color: "#ffffff",
  },
  rowLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "400",
    paddingRight: 10,
  },
  rowLabelHover: {
    color: "#ffffff",
  },
  rowValue: {
    maxWidth: 126,
    color: "#cbbdd2",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "right",
  },
  rowValueHover: {
    color: "#ffffff",
  },
  chevron: {
    color: "#74677d",
    fontSize: 28,
    marginLeft: 8,
  },
  chevronHover: {
    color: "#ffffff",
  },
  message: {
    color: "#ff4f7b",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,6,0.68)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  selectorSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#121016",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
  },
  selectorHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorHeaderButton: {
    width: 72,
    minHeight: 44,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  selectorHeaderButtonHover: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ translateY: -1 }],
  },
  selectorHeaderButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  clearText: {
    color: "#cbbdd2",
    fontSize: 16,
    fontWeight: "600",
  },
  selectorTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  selectorHint: {
    color: "#a79aaa",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  optionList: {
    paddingBottom: 12,
    gap: 8,
  },
  optionRow: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#33273d",
    backgroundColor: "#1b1522",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  optionRowSelected: {
    borderColor: "#ff4f7b",
    backgroundColor: "#321827",
  },
  optionRowHover: {
    borderColor: "#ffffff",
    backgroundColor: "#261d2f",
    transform: [{ translateX: 4 }],
  },
  optionRowPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  optionText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    paddingRight: 12,
  },
  optionTextSelected: {
    color: "#ff7aa2",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#74677d",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    borderColor: "#ff4f7b",
    backgroundColor: "#ff4f7b",
  },
  checkText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
});
