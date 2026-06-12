import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { user, signOut, updateProfile } = useAuth();
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0] || "U"}</Text>
          </View>
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
