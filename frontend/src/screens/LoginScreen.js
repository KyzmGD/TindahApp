import { useState } from "react";
import { Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

const LOGO = require("../../assets/tindah_logo_stitch.png");
const HERO_BACKGROUND = require("../../assets/explore-hearts-bg.png");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthdayPattern = /^\d{4}-\d{2}-\d{2}$/;
const GENDER_OPTIONS = [
  { label: "Woman", value: "woman" },
  { label: "Man", value: "man" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Other", value: "other" },
];
const PLAYER_FEATURES = [
  { icon: "⌁", title: "Smart matching", text: "Find players who fit your games, rank, and playstyle." },
  { icon: "◉", title: "Live presence", text: "See who is online and ready to queue right now." },
  { icon: "⚔", title: "Squad ready", text: "Create teams, recruit players, and chat in one place." },
];

function formatBirthdayInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

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

function PasswordField({ visible, onToggle, ...props }) {
  return (
    <View style={styles.passwordField}>
      <Input {...props} secureTextEntry={!visible} inputStyle={styles.passwordInput} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        accessibilityState={{ expanded: visible }}
        onPress={onToggle}
        style={({ hovered, pressed }) => [styles.passwordToggle, hovered && styles.passwordToggleHover, pressed && styles.controlPressed]}
      >
        <Text style={styles.passwordToggleText}>{visible ? "HIDE" : "SHOW"}</Text>
      </Pressable>
    </View>
  );
}

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 1120;
  const isMobile = width < 600;
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    gender: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      if (!form.gender) {
        nextErrors.gender = "Choose your gender.";
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

  const updateBirthday = (value) => {
    updateField("birthDate", formatBirthdayInput(value));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setFieldErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
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
          gender: form.gender,
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
      <View style={styles.ambientPink} />
      <View style={styles.ambientBlue} />
      <ScrollView contentContainerStyle={[styles.page, isMobile && styles.pageMobile]} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <View style={styles.brandLockup}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>Tindah</Text>
              <Text style={styles.brandTag}>PLAYER NETWORK</Text>
            </View>
          </View>
          {!isMobile ? <View style={styles.secureBadge}>
            <View style={styles.secureDot} />
            <Text style={styles.secureText}>SECURE PLAYER ACCESS</Text>
          </View> : null}
        </View>

        <View style={[styles.content, !isWide && styles.contentCompact]}>
          {isWide ? (
            <ImageBackground source={HERO_BACKGROUND} imageStyle={styles.heroBackgroundImage} style={styles.hero}>
              <View style={styles.heroGrid} />
              <View style={styles.heroGlow} />
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>YOUR NEXT SQUAD IS ONLINE</Text></View>
                <Text style={styles.heroTitle}>FIND YOUR DUO.{"\n"}<Text style={styles.heroTitleAccent}>OWN THE LOBBY.</Text></Text>
                <Text style={styles.heroCopy}>Match by game, rank, and vibe. Build a squad that actually wants to play the way you do.</Text>
                <View style={styles.featureList}>
                  {PLAYER_FEATURES.map((feature) => (
                    <View key={feature.title} style={styles.featureCard}>
                      <View style={styles.featureIcon}><Text style={styles.featureIconText}>{feature.icon}</Text></View>
                      <View style={styles.featureCopy}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureText}>{feature.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.gameRail}><Text style={styles.gameRailText}>VALORANT</Text><View style={styles.railDot} /><Text style={styles.gameRailText}>PUBG</Text><View style={styles.railDot} /><Text style={styles.gameRailText}>TFT</Text><View style={styles.railDot} /><Text style={styles.gameRailText}>FREE FIRE</Text></View>
            </ImageBackground>
          ) : null}

          <View style={[styles.authCard, isSignup && styles.authCardSignup, !isWide && styles.authCardCompact, isMobile && styles.authCardMobile]}>
            <View style={styles.formHeader}>
              <Text style={styles.formEyebrow}>{isSignup ? "CREATE PLAYER PROFILE" : "WELCOME BACK, PLAYER"}</Text>
              <Text style={styles.title}>{isSignup ? "Join the lobby" : "Ready to queue?"}</Text>
              <Text style={styles.subtitle}>{isSignup ? "Build your profile and start finding teammates." : "Sign in to continue matching, chatting, and playing."}</Text>
            </View>

            <View style={styles.segment}>
              {[{ label: "SIGN IN", value: "login" }, { label: "CREATE ACCOUNT", value: "signup" }].map((item) => {
                const active = mode === item.value;
                return (
                  <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => switchMode(item.value)} style={({ hovered, pressed }) => [styles.segmentButton, active && styles.segmentButtonActive, hovered && !active && styles.segmentButtonHover, pressed && styles.controlPressed]}>
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.formFields}>
              {isSignup ? (
                <>
                  <View style={[styles.formRow, !isWide && styles.formRowCompact]}>
                    <Input label="Player name" placeholder="How players will know you" value={form.name} error={fieldErrors.name} onChangeText={(value) => updateField("name", value)} autoComplete="name" textContentType="name" autoCapitalize="words" style={styles.flexField} inputStyle={styles.authInput} />
                    <Input label="Birthday" placeholder="YYYY-MM-DD" value={form.birthDate} error={fieldErrors.birthDate} onChangeText={updateBirthday} keyboardType="number-pad" maxLength={10} style={styles.flexField} inputStyle={styles.authInput} />
                  </View>
                  <Text style={styles.fieldHint}>18+ only · Enter year, month, and day. Example: 2000-05-21.</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Choose your identity</Text>
                    <View style={styles.genderGrid}>
                      {GENDER_OPTIONS.map((option) => {
                        const selected = form.gender === option.value;
                        return (
                          <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={({ hovered, pressed }) => [styles.genderChip, selected && styles.genderChipSelected, hovered && styles.genderChipHover, pressed && styles.controlPressed]} onPress={() => updateField("gender", option.value)}>
                            <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>{selected ? "● " : "○ "}{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {fieldErrors.gender ? <Text style={styles.fieldError}>{fieldErrors.gender}</Text> : null}
                  </View>
                </>
              ) : null}

              <Input label="Email address" placeholder="player@example.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" value={form.email} error={fieldErrors.email} onChangeText={(value) => updateField("email", value)} inputStyle={styles.authInput} onSubmitEditing={!isSignup ? submit : undefined} />
              <PasswordField label="Password" placeholder={isSignup ? "8+ characters, letters and numbers" : "Enter your password"} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} autoComplete={isSignup ? "new-password" : "password"} textContentType={isSignup ? "newPassword" : "password"} value={form.password} error={fieldErrors.password} onChangeText={(value) => updateField("password", value)} onSubmitEditing={!isSignup ? submit : undefined} />
              {isSignup ? <PasswordField label="Confirm password" placeholder="Re-enter your password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} autoComplete="new-password" textContentType="newPassword" value={form.confirmPassword} error={fieldErrors.confirmPassword} onChangeText={(value) => updateField("confirmPassword", value)} onSubmitEditing={submit} /> : null}
            </View>

            {error ? <View style={styles.errorBanner}><Text style={styles.errorIcon}>!</Text><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text></View> : null}

            <Button title={isSignup ? "CREATE MY PLAYER PROFILE  ›" : "ENTER THE LOBBY  ›"} loading={loading} disabled={hasVisibleErrors && !isFormReady} onPress={submit} style={styles.submitButton} />
            {isSignup ? <Text style={styles.legal}>By creating an account, you confirm that you are 18 or older and agree to play respectfully.</Text> : null}
            <View style={styles.switchPrompt}>
              <Text style={styles.switchPromptText}>{isSignup ? "Already have a player profile?" : "New to Tindah?"}</Text>
              <Pressable accessibilityRole="button" onPress={() => switchMode(isSignup ? "login" : "signup")} style={({ hovered, pressed }) => [styles.switchButton, hovered && styles.switchButtonHover, pressed && styles.controlPressed]}><Text style={styles.switchButtonText}>{isSignup ? "SIGN IN" : "CREATE ACCOUNT"}</Text></Pressable>
            </View>
            <View style={styles.statusBar}><View style={styles.statusDot} /><Text style={styles.statusBarText}>MATCHMAKING SERVICES OPERATIONAL</Text></View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070d1d",
  },
  ambientPink: { position: "absolute", width: 420, height: 420, borderRadius: 210, left: -180, top: -190, backgroundColor: "rgba(255,55,111,0.09)" },
  ambientBlue: { position: "absolute", width: 520, height: 520, borderRadius: 260, right: -250, bottom: -250, backgroundColor: "rgba(31,198,255,0.07)" },
  page: { flexGrow: 1, width: "100%", maxWidth: 1440, alignSelf: "center", paddingHorizontal: 34, paddingTop: 22, paddingBottom: 30 },
  pageMobile: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 18 },
  topbar: { minHeight: 54, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 11 },
  logo: { width: 46, height: 46, borderRadius: 12 },
  brandName: { color: "#f3f6ff", fontSize: 22, lineHeight: 23, fontWeight: "900", letterSpacing: -0.5 },
  brandTag: { color: "#7987a8", fontSize: 7, fontWeight: "900", letterSpacing: 1.5, marginTop: 3 },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 30, borderWidth: 1, borderColor: "#23304c", borderRadius: 15, paddingHorizontal: 12, backgroundColor: "rgba(13,22,42,0.74)" },
  secureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#31dfa8", shadowColor: "#31dfa8", shadowOpacity: 0.8, shadowRadius: 6 },
  secureText: { color: "#8694b5", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  content: {
    flexGrow: 1,
    minHeight: 670,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "stretch",
    gap: 24,
  },
  contentCompact: { minHeight: 0, alignItems: "center" },
  hero: { flex: 1, maxWidth: 720, minHeight: 670, borderRadius: 30, overflow: "hidden", backgroundColor: "#0b1730", borderWidth: 1, borderColor: "#22304d", justifyContent: "space-between" },
  heroBackgroundImage: { opacity: 0.16, resizeMode: "cover" },
  heroGrid: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.22, borderWidth: 1, borderColor: "rgba(50,200,255,0.24)" },
  heroGlow: { position: "absolute", width: 360, height: 360, borderRadius: 180, right: -100, top: 70, backgroundColor: "rgba(255,67,121,0.13)" },
  heroContent: { paddingHorizontal: 54, paddingTop: 62, maxWidth: 630 },
  heroBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(65,223,183,0.3)", backgroundColor: "rgba(20,85,77,0.28)", borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 26 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#42e0b0" },
  heroBadgeText: { color: "#7beacb", fontSize: 8, fontWeight: "900", letterSpacing: 1.15 },
  heroTitle: { color: "#edf2ff", fontSize: 48, lineHeight: 52, letterSpacing: -2.2, fontWeight: "900" },
  heroTitleAccent: { color: "#ff5579" },
  heroCopy: { color: "#9aa8c9", maxWidth: 520, fontSize: 15, lineHeight: 24, marginTop: 20 },
  featureList: { marginTop: 34, gap: 11 },
  featureCard: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.055)", borderRadius: 14, backgroundColor: "rgba(12,22,43,0.72)" },
  featureIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,80,120,0.13)", borderWidth: 1, borderColor: "rgba(255,93,132,0.24)" },
  featureIconText: { color: "#ff6f91", fontSize: 18, fontWeight: "900" },
  featureCopy: { flex: 1 },
  featureTitle: { color: "#dfe7fb", fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  featureText: { color: "#7f8dab", fontSize: 10, lineHeight: 15, marginTop: 3 },
  gameRail: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.055)", backgroundColor: "rgba(5,12,27,0.7)" },
  gameRailText: { color: "#657495", fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  railDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#ff526b" },
  authCard: { width: 460, alignSelf: "center", borderRadius: 28, paddingHorizontal: 34, paddingVertical: 32, backgroundColor: "rgba(15,24,44,0.97)", borderWidth: 1, borderColor: "#253451", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  authCardSignup: { width: 520 },
  authCardCompact: { width: "100%", maxWidth: 540 },
  authCardMobile: { paddingHorizontal: 21, paddingVertical: 25, borderRadius: 21 },
  formHeader: { marginBottom: 22 },
  formEyebrow: { color: "#ff6788", fontSize: 9, fontWeight: "900", letterSpacing: 1.45, marginBottom: 9 },
  title: { color: "#f2f5ff", fontSize: 31, lineHeight: 36, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: "#8795b5", fontSize: 12, lineHeight: 19, marginTop: 7 },
  segment: { flexDirection: "row", minHeight: 44, padding: 4, borderRadius: 13, backgroundColor: "#0a1327", borderWidth: 1, borderColor: "#202d47", marginBottom: 22 },
  segmentButton: { flex: 1, minHeight: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: "#ff526b", shadowColor: "#ff526b", shadowOpacity: 0.22, shadowRadius: 9 },
  segmentButtonHover: { backgroundColor: "#15213a" },
  segmentText: { color: "#71809f", fontSize: 9, fontWeight: "900", letterSpacing: 0.75 },
  segmentTextActive: { color: "#ffffff" },
  formFields: { gap: 15 },
  formRow: { flexDirection: "row", gap: 12 },
  formRowCompact: { flexDirection: "column" },
  flexField: { flex: 1, minWidth: 0 },
  authInput: { minHeight: 50, borderRadius: 12, borderColor: "#2a3957", backgroundColor: "#0b1529", color: "#edf2ff", fontSize: 14, shadowOpacity: 0 },
  passwordField: { position: "relative" },
  passwordInput: { minHeight: 50, borderRadius: 12, borderColor: "#2a3957", backgroundColor: "#0b1529", color: "#edf2ff", fontSize: 14, shadowOpacity: 0, paddingRight: 68 },
  passwordToggle: { position: "absolute", right: 10, top: 29, minWidth: 48, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  passwordToggleHover: { backgroundColor: "#1b2943" },
  passwordToggleText: { color: "#ff7895", fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  controlPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  submitButton: { marginTop: 19, minHeight: 52, borderRadius: 13, backgroundColor: "#ff526b", borderColor: "#ff7187", shadowColor: "#ff526b", shadowOpacity: 0.26, shadowRadius: 14 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 42, marginTop: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: "rgba(255,82,107,0.1)", borderWidth: 1, borderColor: "rgba(255,82,107,0.32)" },
  errorIcon: { width: 20, height: 20, borderRadius: 10, textAlign: "center", color: "#fff", backgroundColor: "#ff526b", fontSize: 12, lineHeight: 20, fontWeight: "900", overflow: "hidden" },
  error: { flex: 1, color: "#ff9caf", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  legal: { color: "#64728f", fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 11, paddingHorizontal: 8 },
  switchPrompt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 19 },
  switchPromptText: { color: "#7f8dab", fontSize: 10 },
  switchButton: { paddingVertical: 5, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: "transparent" },
  switchButtonHover: { borderBottomColor: "#ff6b8b" },
  switchButtonText: { color: "#ff6b8b", fontSize: 9, fontWeight: "900", letterSpacing: 0.55 },
  statusBar: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 23, paddingTop: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.055)" },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#35d9a6" },
  statusBarText: { color: "#54627e", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  fieldHint: {
    color: "#667594",
    fontSize: 9,
    lineHeight: 14,
    marginTop: -8,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: { color: "#aeb9d2", fontSize: 11, fontWeight: "800" },
  genderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  genderChip: {
    flexGrow: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3957",
    backgroundColor: "#0b1529",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  genderChipSelected: { borderColor: "#ff5b7b", backgroundColor: "rgba(255,82,107,0.12)" },
  genderChipHover: { borderColor: "#6d7da0", backgroundColor: "#142039" },
  genderChipText: { color: "#8290ad", fontSize: 10, fontWeight: "800" },
  genderChipTextSelected: { color: "#ff7895" },
  fieldError: { color: "#ff6c88", fontSize: 10 },
});
