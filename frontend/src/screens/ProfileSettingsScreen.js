import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../services/upload.api";

const MAX_PHOTOS = 6;
const MIN_DISTANCE_KM = 2;
const MAX_DISTANCE_KM = 100;
const MIN_AGE = 18;
const MAX_AGE = 100;
const SCREEN_PADDING = 18;
const PHOTO_GAP = 10;
const PHOTO_SIZE = (Dimensions.get("window").width - SCREEN_PADDING * 2 - PHOTO_GAP * 2) / 3;

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

function getSettingsFromUser(user) {
  return {
    maxDistanceKm: clamp(
      Number(user?.preferences?.maxDistanceKm || 50),
      MIN_DISTANCE_KM,
      MAX_DISTANCE_KM,
    ),
    minAge: clamp(Number(user?.preferences?.ageRange?.min || 18), MIN_AGE, MAX_AGE),
    maxAge: clamp(Number(user?.preferences?.ageRange?.max || 60), MIN_AGE, MAX_AGE),
    photos: normalizePhotos(user?.photos),
  };
}

export function buildProfileSettingsPayload(settings) {
  return {
    maxDistanceKm: settings.maxDistanceKm,
    minAge: settings.minAge,
    maxAge: settings.maxAge,
    photos: normalizePhotos(settings.photos),
  };
}

export default function ProfileSettingsScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const [settings, setSettings] = useState(() => getSettingsFromUser(user));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const allowLeaveRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    setSettings(getSettingsFromUser(user));
  }, [user]);

  const photoSlots = useMemo(() => buildPhotoSlots(settings.photos), [settings.photos]);
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

      const url = await uploadImage(result.assets[0].uri);

      setSettings((current) => ({
        ...current,
        photos: normalizePhotos([
          ...current.photos,
          {
            url,
            publicId: null,
          },
        ]),
      }));
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

  const renderPhotoSlot = ({ item, drag, isActive }) => (
    <ScaleDecorator activeScale={1.04}>
      {item.type === "photo" ? (
        <Pressable
          disabled={isActive}
          onLongPress={drag}
          delayLongPress={180}
          style={[styles.photoSlot, isActive && styles.photoSlotActive]}
        >
          <Image source={{ uri: item.url }} style={styles.photo} />
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>
              {item.isPrimary ? "Primary" : "Hold"}
            </Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={() => removePhoto(item.url)}
          >
            <Text style={styles.removeButtonText}>x</Text>
          </Pressable>
        </Pressable>
      ) : (
        <Pressable
          style={styles.emptySlot}
          onPress={pickPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#ff4458" />
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          disabled={saving}
          style={[styles.backButton, saving && styles.backButtonDisabled]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            {saving ? "Saving before you leave" : "Photos and discovery controls"}
          </Text>
        </View>
        {saving ? <ActivityIndicator color="#ff4458" /> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discovery distance</Text>
          <Text style={styles.valueText}>{settings.maxDistanceKm} km</Text>
        </View>
        <Slider
          minimumValue={MIN_DISTANCE_KM}
          maximumValue={MAX_DISTANCE_KM}
          step={1}
          value={settings.maxDistanceKm}
          minimumTrackTintColor="#ff4458"
          maximumTrackTintColor="#e4e6ee"
          thumbTintColor="#ff4458"
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
          minimumTrackTintColor="#ff4458"
          maximumTrackTintColor="#e4e6ee"
          thumbTintColor="#ff4458"
          onValueChange={updateMinAge}
        />
        <Text style={styles.sliderLabel}>Maximum age</Text>
        <Slider
          minimumValue={MIN_AGE}
          maximumValue={MAX_AGE}
          step={1}
          value={settings.maxAge}
          minimumTrackTintColor="#ff4458"
          maximumTrackTintColor="#e4e6ee"
          thumbTintColor="#ff4458"
          onValueChange={updateMaxAge}
        />
      </View>

      <View style={[styles.section, styles.photoSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile photos</Text>
          <Text style={styles.valueText}>{settings.photos.length}/6</Text>
        </View>
        <Text style={styles.helperText}>Hold a photo and drag it to reorder.</Text>
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

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafbff",
    paddingHorizontal: 18,
    paddingTop: 58,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  backButtonDisabled: {
    opacity: 0.55,
  },
  backText: {
    color: "#ff4458",
    fontSize: 30,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: "#171a25",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#777b8d",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: "#eceef5",
    paddingVertical: 16,
  },
  photoSection: {
    borderBottomWidth: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#171a25",
    fontSize: 17,
    fontWeight: "900",
  },
  valueText: {
    color: "#ff4458",
    fontSize: 15,
    fontWeight: "900",
  },
  sliderBounds: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  boundText: {
    color: "#8c8f9f",
    fontSize: 12,
    fontWeight: "700",
  },
  sliderLabel: {
    color: "#777b8d",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  helperText: {
    color: "#777b8d",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  photoGrid: {
    minHeight: 244,
  },
  photoSlot: {
    width: PHOTO_SIZE,
    aspectRatio: 0.78,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginRight: PHOTO_GAP,
    marginBottom: 10,
  },
  photoSlotActive: {
    opacity: 0.86,
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
    backgroundColor: "rgba(23,26,37,0.72)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  photoBadgeText: {
    color: "#fff",
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
    backgroundColor: "rgba(23,26,37,0.72)",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  emptySlot: {
    width: PHOTO_SIZE,
    aspectRatio: 0.78,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d7dae5",
    backgroundColor: "#fff",
    marginRight: PHOTO_GAP,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlus: {
    color: "#ff4458",
    fontSize: 28,
    fontWeight: "900",
  },
  emptyLabel: {
    color: "#8c8f9f",
    fontSize: 12,
    fontWeight: "800",
  },
  message: {
    color: "#ff4458",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
});
