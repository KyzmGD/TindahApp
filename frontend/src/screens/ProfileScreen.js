import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import {
  uploadProfileImage,
  saveAvatar,
} from "../services/upload.api";

const GENDER_OPTIONS = [
  { label: "Women", value: "woman" },
  { label: "Men", value: "man" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Other", value: "other" },
];
const GENDER_COLORS = {
  woman: {
    border: "#ff4f9a",
    background: "rgba(255,79,154,0.12)",
    selectedBackground: "rgba(255,79,154,0.24)",
    selectedFill: "#b31762",
    text: "#ff7ab8",
  },
  man: {
    border: "#20c7ff",
    background: "rgba(32,199,255,0.12)",
    selectedBackground: "rgba(32,199,255,0.23)",
    selectedFill: "#0d6d96",
    text: "#57d7ff",
  },
  nonbinary: {
    border: "#ffd166",
    background: "rgba(255,209,102,0.12)",
    selectedBackground: "rgba(255,209,102,0.22)",
    selectedFill: "#8a6412",
    text: "#ffd166",
  },
  other: {
    border: "#7cf4c8",
    background: "rgba(124,244,200,0.11)",
    selectedBackground: "rgba(124,244,200,0.2)",
    selectedFill: "#19775e",
    text: "#7cf4c8",
  },
};

function getGenderColor(value) {
  return GENDER_COLORS[value] || GENDER_COLORS.other;
}

const getAvatar = (user) => {
  if (user?.avatarUrl) {
    return user.avatarUrl;
  }

  return null;
};

const getSearchFilters = (user) => ({
  genderPreference: user?.genderPreference || user?.interestedIn || [],
  minAge: String(user?.minAge || user?.preferences?.ageRange?.min || 18),
  maxAge: String(user?.maxAge || user?.preferences?.ageRange?.max || 60),
});

export default function ProfileScreen({ navigation }) {
  const {
  user,
  signOut,
  updateProfile,
  refreshUser,
} = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    jobTitle: user?.jobTitle || "",
    school: user?.school || "",
    interests: (user?.interests || []).join(", "),
    genderPreference: getSearchFilters(user).genderPreference,
    minAge: getSearchFilters(user).minAge,
    maxAge: getSearchFilters(user).maxAge,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(() => getAvatar(user));
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const filtersAnimation = useRef(new Animated.Value(0)).current;
  const avatarPreviewUrl = pendingAvatar?.url || savedAvatarUrl || getAvatar(user);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const searchFilters = getSearchFilters(user);
    setForm({
      name: user?.name || "",
      bio: user?.bio || "",
      jobTitle: user?.jobTitle || "",
      school: user?.school || "",
      interests: (user?.interests || []).join(", "),
      genderPreference: searchFilters.genderPreference,
      minAge: searchFilters.minAge,
      maxAge: searchFilters.maxAge,
    });
  }, [user]);

  useEffect(() => {
    Animated.timing(filtersAnimation, {
      toValue: 1,
      duration: 460,
      useNativeDriver: true,
    }).start();
  }, [filtersAnimation]);

  useEffect(() => {
    setPendingAvatar(null);
    setSavedAvatarUrl(getAvatar(user));
  }, [user?.avatarUrl]);

  const toggleGenderPreference = (value) => {
    setForm((current) => {
      const selected = current.genderPreference.includes(value)
        ? current.genderPreference.filter((item) => item !== value)
        : [...current.genderPreference, value];

      return {
        ...current,
        genderPreference: selected.length ? selected : current.genderPreference,
      };
    });
  };
  const pickAvatar = async () => {
    if (avatarUploading || avatarSaving) {
      return;
    }

    try {
      setAvatarUploading(true);
      setMessage("");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const uploadedImage = await uploadProfileImage(result.assets[0]);

      setPendingAvatar(uploadedImage);
      setMessage(
        uploadedImage.storage === "cloudinary"
          ? "Avatar uploaded to Cloudinary. Tap Save avatar to apply."
          : "Avatar uploaded locally. Tap Save avatar to apply.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const confirmAvatar = async () => {
    if (!pendingAvatar || avatarSaving) {
      return;
    }

    const avatarToSave = pendingAvatar;

    try {
      setAvatarSaving(true);
      setMessage("Saving avatar...");
      setPendingAvatar(null);
      setSavedAvatarUrl(avatarToSave.url);
      await saveAvatar(avatarToSave.url, avatarToSave.publicId);
      setPendingAvatar(null);
      setMessage("Avatar saved");
      await refreshUser();
    } catch (error) {
      setPendingAvatar(avatarToSave);
      setSavedAvatarUrl(getAvatar(user));
      setMessage(error.message || "Could not save avatar.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const cancelAvatar = () => {
    setPendingAvatar(null);
    setMessage("");
  };
  const save = async () => {
    setSaving(true);
    setMessage("");

    try {
      await updateProfile({
        name: form.name,
        bio: form.bio,
        jobTitle: form.jobTitle,
        school: form.school,
        interests: form.interests
          .split(",")
          .map((interest) => interest.trim())
          .filter(Boolean),
        genderPreference: form.genderPreference,
        minAge: Number(form.minAge),
        maxAge: Number(form.maxAge),
      });
      setMessage("Profile saved");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            disabled={avatarUploading || avatarSaving}
            style={({ hovered, pressed }) => [
              styles.avatar,
              hovered && styles.avatarHover,
              pressed && styles.avatarPressed,
              pendingAvatar && styles.avatarPending,
            ]}
            onPress={pickAvatar}
          >
            {({ hovered }) => (
              <>
                {avatarPreviewUrl ? (
                  <Image
                    source={{
                      uri: avatarPreviewUrl,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {user?.name?.[0] || "U"}
                  </Text>
                )}

                {(hovered || avatarUploading) ? (
                  <View style={styles.avatarOverlay}>
                    {avatarUploading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <View style={styles.cameraIcon}>
                        <View style={styles.cameraTop} />
                        <View style={styles.cameraLens} />
                      </View>
                    )}
                    <Text style={styles.avatarOverlayText}>
                      {avatarUploading ? "Uploading" : "Change"}
                    </Text>
                  </View>
                ) : null}

                {pendingAvatar ? (
                  <View style={styles.avatarPreviewBadge}>
                    <Text style={styles.avatarPreviewText}>Preview</Text>
                  </View>
                ) : null}
              </>
            )}
          </Pressable>
          {pendingAvatar ? (
            <View style={styles.avatarActions}>
              <Pressable
                disabled={avatarSaving}
                style={({ hovered, pressed }) => [
                  styles.avatarSaveButton,
                  hovered && styles.avatarSaveButtonHover,
                  pressed && styles.avatarActionPressed,
                ]}
                onPress={confirmAvatar}
              >
                {avatarSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.avatarSaveText}>Save avatar</Text>
                )}
              </Pressable>
              <Pressable
                disabled={avatarSaving}
                style={({ hovered, pressed }) => [
                  styles.avatarCancelButton,
                  hovered && styles.avatarCancelButtonHover,
                  pressed && styles.avatarActionPressed,
                ]}
                onPress={cancelAvatar}
              >
                <Text style={styles.avatarCancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.title}>{user?.name || "Your profile"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Input label="Name" value={form.name} onChangeText={(value) => updateField("name", value)} />
        <Input
          label="Bio"
          value={form.bio}
          onChangeText={(value) => updateField("bio", value)}
          multiline
          inputStyle={styles.bioInput}
        />
        <Input label="Job title" value={form.jobTitle} onChangeText={(value) => updateField("jobTitle", value)} />
        <Input label="School" value={form.school} onChangeText={(value) => updateField("school", value)} />
        <Input
          label="Interests"
          value={form.interests}
          onChangeText={(value) => updateField("interests", value)}
          placeholder="Coffee, travel, music"
        />
        <Animated.View
          style={[
            styles.filterSection,
            {
              opacity: filtersAnimation,
              transform: [
                {
                  translateY: filtersAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Search filters</Text>
          <Text style={styles.label}>Interested in</Text>
          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((option) => {
              const selected = form.genderPreference.includes(option.value);
              const genderColor = getGenderColor(option.value);

              return (
                <Pressable
                  key={option.value}
                  style={({ hovered, pressed }) => [
                    styles.genderChip,
                    {
                      borderColor: genderColor.border,
                      backgroundColor: selected
                        ? genderColor.selectedFill
                        : genderColor.background,
                    },
                    selected && {
                      shadowColor: genderColor.border,
                      borderWidth: 2,
                    },
                    hovered && [
                      styles.genderChipHover,
                      {
                        borderColor: genderColor.border,
                        shadowColor: genderColor.border,
                      },
                    ],
                    pressed && styles.genderChipPressed,
                  ]}
                  onPress={() => toggleGenderPreference(option.value)}
                >
                  {({ hovered }) => (
                    <View style={styles.genderChipContent}>
                      {selected ? <View style={styles.genderCheckDot} /> : null}
                      <Text
                        style={[
                          styles.genderChipText,
                          { color: genderColor.text },
                          selected && styles.genderChipTextSelected,
                          hovered && styles.genderChipTextHover,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.ageRow}>
            <Input
              label="Min age"
              value={form.minAge}
              onChangeText={(value) => updateField("minAge", value)}
              keyboardType="numeric"
              style={styles.ageInput}
            />
            <Input
              label="Max age"
              value={form.maxAge}
              onChangeText={(value) => updateField("maxAge", value)}
              keyboardType="numeric"
              style={styles.ageInput}
            />
          </View>
        </Animated.View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button
          title="Settings"
          variant="secondary"
          onPress={() => navigation.navigate("ProfileSettings")}
        />
        <Button title="Save profile" loading={saving} onPress={save} />
        <Button title="Log out" variant="secondary" onPress={signOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050506",
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4f7b",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    shadowColor: "#ff4f7b",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  avatarHover: {
    borderColor: "#20c7ff",
    transform: [{ translateY: -2 }, { scale: 1.04 }],
  },
  avatarPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  avatarPending: {
    borderColor: "#ffd166",
  },
  avatarText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "900",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 46,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,6,0.58)",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  cameraIcon: {
    width: 31,
    height: 23,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTop: {
    position: "absolute",
    top: -6,
    width: 13,
    height: 6,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#ffffff",
  },
  cameraLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  avatarOverlayText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  avatarPreviewBadge: {
    position: "absolute",
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,209,102,0.94)",
  },
  avatarPreviewText: {
    color: "#17120a",
    fontSize: 10,
    fontWeight: "900",
  },
  avatarActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  avatarSaveButton: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4f7b",
    borderWidth: 1,
    borderColor: "#ff7aa2",
  },
  avatarSaveButtonHover: {
    backgroundColor: "#ff2f6d",
    borderColor: "#20c7ff",
    transform: [{ translateY: -1 }],
  },
  avatarSaveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  avatarCancelButton: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1c1720",
    borderWidth: 1,
    borderColor: "#403449",
  },
  avatarCancelButtonHover: {
    borderColor: "#ffffff",
    backgroundColor: "#2a2133",
    transform: [{ translateY: -1 }],
  },
  avatarCancelText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  avatarActionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  email: {
    color: "#cbbdd2",
    fontWeight: "600",
  },
  bioInput: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  message: {
    color: "#ff4f7b",
    fontWeight: "800",
    textAlign: "center",
  },
  filterSection: {
    gap: 12,
    paddingTop: 6,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    color: "#cbbdd2",
    fontSize: 13,
    fontWeight: "700",
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genderChip: {
    borderWidth: 1,
    borderColor: "#403449",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#1c1720",
  },
  genderChipSelected: {
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  genderChipHover: {
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    transform: [{ translateY: -2 }, { scale: 1.03 }],
  },
  genderChipPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  genderChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  genderCheckDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  genderChipText: {
    color: "#cbbdd2",
    fontWeight: "800",
  },
  genderChipTextSelected: {
    color: "#ffffff",
  },
  genderChipTextHover: {
    color: "#ffffff",
  },
  ageRow: {
    flexDirection: "row",
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
});
