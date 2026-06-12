import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    birthDate: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        await signIn(form.email.trim(), form.password);
      } else {
        await signUp({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>T</Text>
        </View>
        <Text style={styles.title}>Find your match</Text>
        <Text style={styles.subtitle}>Swipe, match, and start a real conversation.</Text>

        <View style={styles.segment}>
          <Button
            title="Login"
            variant={mode === "login" ? "primary" : "secondary"}
            onPress={() => setMode("login")}
            style={styles.segmentButton}
          />
          <Button
            title="Sign up"
            variant={mode === "signup" ? "primary" : "secondary"}
            onPress={() => setMode("signup")}
            style={styles.segmentButton}
          />
        </View>

        {mode === "signup" ? (
          <>
            <Input label="Name" value={form.name} onChangeText={(value) => updateField("name", value)} />
            <Input
              label="Birthday"
              placeholder="YYYY-MM-DD"
              value={form.birthDate}
              onChangeText={(value) => updateField("birthDate", value)}
            />
          </>
        ) : null}

        <Input
          label="Email"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(value) => updateField("email", value)}
        />
        <Input
          label="Password"
          secureTextEntry
          value={form.password}
          onChangeText={(value) => updateField("password", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title={mode === "login" ? "Continue" : "Create account"} loading={loading} onPress={submit} />
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  brandMark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ff4458",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandMarkText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  title: {
    color: "#171a25",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6d7180",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  segment: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
  },
  error: {
    color: "#ff4458",
    fontWeight: "700",
  },
});
