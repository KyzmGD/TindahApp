import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthdayPattern = /^\d{4}-\d{2}-\d{2}$/;

function getBirthdayValidation(value) {
  if (!value) {
    return "Birthday is required.";
  }

  if (!birthdayPattern.test(value)) {
    return "Use YYYY-MM-DD format.";
  }

  const birthday = new Date(`${value}T00:00:00.000Z`);
  const [year, month, day] = value.split("-").map(Number);
  const isRealDate =
    birthday.getUTCFullYear() === year &&
    birthday.getUTCMonth() === month - 1 &&
    birthday.getUTCDate() === day;

  if (!isRealDate) {
    return "Enter a real birthday.";
  }

  const today = new Date();
  let age = today.getUTCFullYear() - year;
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  if (birthday > today) {
    return "Birthday cannot be in the future.";
  }

  if (age < 18) {
    return "You must be at least 18 years old.";
  }

  if (age > 100) {
    return "Enter a realistic birthday.";
  }

  return "";
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const validateForm = () => {
    const nextErrors = {};
    const email = form.email.trim();
    const name = form.name.trim();

    if (isSignup && !name) {
      nextErrors.name = "Name is required.";
    } else if (isSignup && name.length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    } else if (isSignup && name.length > 80) {
      nextErrors.name = "Name must be 80 characters or less.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    } else if (isSignup && !/[A-Za-z]/.test(form.password)) {
      nextErrors.password = "Password needs at least one letter.";
    } else if (isSignup && !/\d/.test(form.password)) {
      nextErrors.password = "Password needs at least one number.";
    }

    if (isSignup) {
      if (!form.confirmPassword) {
        nextErrors.confirmPassword = "Confirm your password.";
      } else if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }

      const birthdayError = getBirthdayValidation(form.birthDate);
      if (birthdayError) {
        nextErrors.birthDate = birthdayError;
      }
    }

    return nextErrors;
  };

  const isFormReady = Object.keys(validateForm()).length === 0;
  const hasVisibleErrors = Object.values(fieldErrors).some(Boolean);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setError("");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setFieldErrors({});
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Please fix the highlighted fields.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        await signIn(form.email.trim(), form.password);
      } else {
        await signUp({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          birthDate: form.birthDate,
        });
      }
    } catch (submitError) {
      if (submitError.details) {
        setFieldErrors(submitError.details);
      }
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
            onPress={() => switchMode("login")}
            style={styles.segmentButton}
          />
          <Button
            title="Sign up"
            variant={mode === "signup" ? "primary" : "secondary"}
            onPress={() => switchMode("signup")}
            style={styles.segmentButton}
          />
        </View>

        {isSignup ? (
          <>
            <Input
              label="Name"
              value={form.name}
              error={fieldErrors.name}
              onChangeText={(value) => updateField("name", value)}
              autoComplete="name"
              textContentType="name"
            />
            <Input
              label="Birthday"
              placeholder="YYYY-MM-DD"
              value={form.birthDate}
              error={fieldErrors.birthDate}
              onChangeText={(value) => updateField("birthDate", value)}
              keyboardType="numbers-and-punctuation"
            />
          </>
        ) : null}

        <Input
          label="Email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={form.email}
          error={fieldErrors.email}
          onChangeText={(value) => updateField("email", value)}
        />
        <Input
          label="Password"
          secureTextEntry
          autoComplete={isSignup ? "new-password" : "password"}
          textContentType={isSignup ? "newPassword" : "password"}
          value={form.password}
          error={fieldErrors.password}
          onChangeText={(value) => updateField("password", value)}
        />
        {isSignup ? (
          <Input
            label="Confirm password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={form.confirmPassword}
            error={fieldErrors.confirmPassword}
            onChangeText={(value) => updateField("confirmPassword", value)}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title={mode === "login" ? "Continue" : "Create account"}
          loading={loading}
          disabled={hasVisibleErrors && !isFormReady}
          onPress={submit}
        />
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
