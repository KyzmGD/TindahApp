import { useEffect, useRef, useState } from "react";
import {
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
  saveProfilePhoto,
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
  if (!user?.photos?.length) return null;

  const primary = user.photos.find(
    (photo) => photo.isPrimary
  );

  return primary?.url || user.photos[0]?.url;
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
  const filtersAnimation = useRef(new Animated.Value(0)).current;

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

  try {

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:0.8,
    });


    if(result.canceled){
      return;
    }


    const uploadedImage = await uploadProfileImage(result.assets[0]);


    await saveProfilePhoto(uploadedImage.url, uploadedImage.publicId);

await refreshUser();

setMessage(
  uploadedImage.storage === "cloudinary"
    ? "Avatar uploaded to Cloudinary"
    : "Avatar uploaded locally"
);


  } catch(error){

    setMessage(error.message);

  }

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
  style={styles.avatar}
  onPress={pickAvatar}
>
  {getAvatar(user) ? (
    <Image
      source={{
        uri: getAvatar(user),
      }}
      style={styles.avatarImage}
    />
  ) : (
    <Pressable
  style={styles.avatar}
  onPress={pickAvatar}
>

{
 user?.photos?.length > 0 ?

 <Image
   source={{
     uri:user.photos[0].url
   }}
   style={styles.avatarImage}
 />

 :

 <Text style={styles.avatarText}>
   {user?.name?.[0] || "U"}
 </Text>

}

</Pressable>
  )}
</Pressable>
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
