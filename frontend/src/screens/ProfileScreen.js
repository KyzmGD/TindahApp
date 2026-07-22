import { useState } from "react";
import {
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
  uploadImage,
  saveProfilePhoto,
} from "../services/upload.api";
const getAvatar = (user) => {
  if (!user?.photos?.length) return null;

  const primary = user.photos.find(
    (photo) => photo.isPrimary
  );

  return primary?.url || user.photos[0]?.url;
};
export default function ProfileScreen() {
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
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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


    const imageUri = result.assets[0].uri;


    const url = await uploadImage(imageUri);


    await saveProfilePhoto(url);

await refreshUser();

setMessage("Avatar updated");


  } catch(error){

    console.log(error);
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

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button title="Save profile" loading={saving} onPress={save} />
        <Button title="Log out" variant="secondary" onPress={signOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafbff",
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
    backgroundColor: "#ff4458",
  },
  avatarText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "900",
  },
  title: {
    color: "#171a25",
    fontSize: 26,
    fontWeight: "900",
  },
  avatarImage: {
  width: "100%",
  height: "100%",
  borderRadius: 46,
},
  email: {
    color: "#777b8d",
    fontWeight: "600",
  },
  bioInput: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  message: {
    color: "#ff4458",
    fontWeight: "800",
    textAlign: "center",
  },
});
