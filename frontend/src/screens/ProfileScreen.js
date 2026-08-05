import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { saveAvatar, uploadProfileImage } from "../services/upload.api";
import { getMatches } from "../services/swipe.api";

const GENDERS = [
  { label: "Women", value: "woman" },
  { label: "Men", value: "man" },
  { label: "Nonbinary", value: "nonbinary" },
  { label: "Anyone", value: "other" },
];

function initialForm(user) {
  const rawMaxAge = user?.maxAge || user?.preferences?.ageRange?.max || 60;
  return {
    name: user?.name || "",
    bio: user?.bio || "",
    jobTitle: user?.jobTitle || "",
    school: user?.school || "",
    interests: (user?.interests || []).join(", "),
    genderPreference: user?.genderPreference || user?.interestedIn || ["other"],
    minAge: Math.min(50, user?.minAge || user?.preferences?.ageRange?.min || 18),
    maxAge: rawMaxAge > 50 ? 51 : rawMaxAge,
    inGameID: user?.gamingProfiles?.[0]?.inGameID || "",
  };
}

function Field({ label, value, onChangeText, multiline, placeholder, editable = true, maxLength, error }) {
  return (
    <View style={[styles.fieldWrap, multiline && styles.fieldWide]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#5f6a87"
        multiline={multiline}
        editable={editable}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[styles.field, multiline && styles.bioField, !editable && styles.fieldDisabled, error && styles.fieldError]}
      />
      {error ? <Text style={styles.validationText}>{error}</Text> : null}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, signOut, updateProfile, refreshUser } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [form, setForm] = useState(() => initialForm(user));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [addingInterest, setAddingInterest] = useState(false);
  const [interestDraft, setInterestDraft] = useState("");
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [matchCount, setMatchCount] = useState(null);

  useEffect(() => setForm(initialForm(user)), [user]);
  useEffect(() => {
    let mounted = true;
    getMatches()
      .then((matches) => { if (mounted) setMatchCount(matches.length); })
      .catch(() => { if (mounted) setMatchCount(null); });
    return () => { mounted = false; };
  }, []);

  const update = (key, value) => {
    setNotice("");
    setForm((current) => ({ ...current, [key]: value }));
  };
  const gamingProfile = user?.gamingProfiles?.[0];
  const avatar = pendingAvatar?.url || user?.avatarUrl || user?.photos?.[0]?.url;
  const baseline = useMemo(() => JSON.stringify(initialForm(user)), [user]);
  const isDirty = JSON.stringify(form) !== baseline;
  const errors = useMemo(() => {
    const next = {};
    const interests = form.interests.split(",").map((item) => item.trim()).filter(Boolean);
    if (form.name.trim().length < 2) next.name = "Enter at least 2 characters.";
    if (form.name.trim().length > 80) next.name = "Use 80 characters or fewer.";
    if (form.bio.trim().length > 500) next.bio = "Use 500 characters or fewer.";
    if (form.jobTitle.trim().length > 80) next.jobTitle = "Use 80 characters or fewer.";
    if (form.school.trim().length > 120) next.school = "Use 120 characters or fewer.";
    if (form.inGameID.trim().length > 80) next.inGameID = "Use 80 characters or fewer.";
    if (interests.length > 20) next.interests = "Choose no more than 20 interests.";
    if (interests.some((item) => item.length > 40)) next.interests = "Each interest must be 40 characters or fewer.";
    if (Number(form.minAge) >= Number(form.maxAge)) next.age = "Maximum age must be greater than minimum age.";
    return next;
  }, [form]);
  const isValid = Object.keys(errors).length === 0;
  const gamerLevel = useMemo(() => {
    const signals = [
      Boolean(avatar),
      form.name.trim().length >= 2,
      Boolean(form.bio.trim()),
      Boolean(form.jobTitle.trim() || form.school.trim()),
      form.interests.split(",").filter((item) => item.trim()).length >= 3,
      Boolean(gamingProfile),
    ];
    return Math.round((signals.filter(Boolean).length / signals.length) * 50);
  }, [avatar, form.bio, form.interests, form.jobTitle, form.name, form.school, gamingProfile]);

  const pickAvatar = async () => {
    try {
      setUploading(true);
      setNotice("");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled) setPendingAvatar(await uploadProfileImage(result.assets[0]));
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  const applyAvatar = async () => {
    if (!pendingAvatar) return;
    try {
      setUploading(true);
      await saveAvatar(pendingAvatar.url, pendingAvatar.publicId);
      setPendingAvatar(null);
      await refreshUser();
      setNoticeType("success");
      setNotice("Avatar updated");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not save avatar.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!isDirty || !isValid) return;
    try {
      setSaving(true);
      setNotice("");
      await updateProfile({
        name: form.name,
        bio: form.bio,
        jobTitle: form.jobTitle,
        school: form.school,
        interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean),
        genderPreference: form.genderPreference,
        minAge: Number(form.minAge),
        maxAge: Number(form.maxAge) === 51 ? 100 : Number(form.maxAge),
        gamingProfiles: gamingProfile
          ? user.gamingProfiles.map((profile, index) => (
              index === 0 ? { ...profile, inGameID: form.inGameID.trim() } : profile
            ))
          : undefined,
      });
      setNoticeType("success");
      setNotice("Changes saved");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const selectGender = (value) => update("genderPreference", value === "other" ? ["woman", "man", "nonbinary", "other"] : [value]);
  const addInterest = () => {
    const interest = interestDraft.trim().replace(/^#/, "");
    if (!interest) return;
    const current = form.interests.split(",").map((item) => item.trim()).filter(Boolean);
    if (!current.some((item) => item.toLowerCase() === interest.toLowerCase())) {
      update("interests", [...current, interest].join(", "));
    }
    setInterestDraft("");
    setAddingInterest(false);
  };
  const removeInterest = (interestToRemove) => {
    const next = form.interests
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item.toLowerCase() !== interestToRemove.toLowerCase());
    update("interests", next.join(", "));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.dashboard, !isDesktop && styles.dashboardMobile]}>
          <View style={[styles.summaryColumn, !isDesktop && styles.summaryColumnMobile]}>
            <View style={styles.profileCard}>
              <Pressable onPress={pickAvatar} style={({ hovered, pressed }) => [styles.avatarRing, hovered && styles.avatarHover, pressed && styles.pressed]}>
                {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{user?.name?.[0] || "P"}</Text></View>}
                <View style={styles.onlineDot} />
                {uploading ? <View style={styles.uploadOverlay}><ActivityIndicator color="#fff" /></View> : null}
              </Pressable>
              <Text style={styles.profileName}>{user?.name || "Your profile"}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ {user?.isVerified ? "Verified Gamer" : "Gamer Profile"}</Text></View>
              {pendingAvatar ? (
                <View style={styles.avatarActions}>
                  <Pressable onPress={applyAvatar} style={styles.miniPrimary}><Text style={styles.miniPrimaryText}>Save photo</Text></Pressable>
                  <Pressable onPress={() => setPendingAvatar(null)} style={styles.miniSecondary}><Text style={styles.miniSecondaryText}>Cancel</Text></Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.cardTitle}>♙ Combat Record</Text>
              <View style={styles.statRow}>
                <View><Text style={styles.statLabel}>VALO RANK</Text><Text style={styles.statValue}>{gamingProfile?.currentRank || "Unranked"}</Text></View>
                <View><Text style={styles.statLabel}>MATCHES</Text><Text style={styles.statValue}>{matchCount === null ? "—" : matchCount.toLocaleString()}</Text></View>
              </View>
              <Text style={styles.levelLabel}>GAMER LEVEL</Text>
              <View style={styles.levelLine}><View style={[styles.levelFill, { width: `${(gamerLevel / 50) * 100}%` }]} /></View>
              <Text style={styles.levelNumber}>{gamerLevel} <Text style={styles.levelMax}>/ 50</Text></Text>
            </View>
          </View>

          <View style={styles.mainColumn}>
            <View style={styles.identityCard}>
              <Text style={styles.sectionTitle}>Identity Grid</Text>
              <View style={styles.fieldGrid}>
                <Field label="Callsign (Name)" value={form.name} onChangeText={(value) => update("name", value)} maxLength={80} error={errors.name} />
                <Field label="Class (Job Title)" value={form.jobTitle} onChangeText={(value) => update("jobTitle", value)} placeholder="Your role" maxLength={80} error={errors.jobTitle} />
                <Field label="Guild (School/Org)" value={form.school} onChangeText={(value) => update("school", value)} placeholder="School or organization" maxLength={120} error={errors.school} />
                <Field label="Ingame Id" value={form.inGameID} onChangeText={(value) => update("inGameID", value)} editable={Boolean(gamingProfile)} placeholder={gamingProfile ? "Your in-game ID" : "Add a gaming profile in Settings"} maxLength={80} error={errors.inGameID} />
                <Field label="Lore (Bio)" value={form.bio} onChangeText={(value) => update("bio", value)} multiline maxLength={500} error={errors.bio} />
              </View>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ProfileSettings")} style={({ hovered }) => [styles.manageProfileLink, hovered && styles.manageProfileLinkHover]}><Text style={styles.manageProfileText}>Manage gaming profile and advanced settings →</Text></Pressable>
              <Text style={styles.fieldLabel}>Equipped Interests</Text>
              <View style={styles.interestsRow}>
                {form.interests.split(",").map((item) => item.trim()).filter(Boolean).map((interest, index) => <Pressable accessibilityLabel={`Remove ${interest}`} key={`${interest}-${index}`} onPress={() => removeInterest(interest)} style={({ hovered }) => [styles.interestChip, hovered && styles.interestChipHover]}><Text style={styles.interestText}>#{interest}  ×</Text></Pressable>)}
                <Pressable onPress={() => setAddingInterest(true)} style={styles.addInterest}><Text style={styles.addInterestText}>+ Add Interest</Text></Pressable>
              </View>
              {addingInterest ? <View style={styles.interestEditor}><TextInput autoFocus value={interestDraft} onChangeText={setInterestDraft} onSubmitEditing={addInterest} placeholder="Interest" placeholderTextColor="#5f6a87" style={styles.interestInput} /><Pressable onPress={addInterest} style={styles.interestAddButton}><Text style={styles.interestAddButtonText}>Add</Text></Pressable><Pressable onPress={() => setAddingInterest(false)}><Text style={styles.interestCancel}>Cancel</Text></Pressable></View> : null}
              {errors.interests ? <Text style={styles.validationText}>{errors.interests}</Text> : null}
            </View>

            <View style={styles.matchCard}>
              <View style={styles.matchHeader}><Text style={styles.sectionTitle}>⚙ Matchmaking Parameters</Text><Text style={styles.filterValue}>{form.genderPreference.length === 4 ? "Anyone" : GENDERS.find((item) => form.genderPreference.includes(item.value))?.label}</Text></View>
              <Text style={styles.fieldLabel}>Target Entities</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((option) => {
                  const selected = option.value === "other" ? form.genderPreference.length === 4 : form.genderPreference.length === 1 && form.genderPreference[0] === option.value;
                  return <Pressable key={option.value} onPress={() => selectGender(option.value)} style={[styles.genderOption, selected && styles.genderSelected]}><Text style={[styles.genderText, selected && styles.genderTextSelected]}>{option.label}</Text></Pressable>;
                })}
              </View>
              <View style={styles.ageHeader}><Text style={styles.fieldLabel}>Age Range</Text><Text style={styles.filterValue}>{form.minAge} - {Number(form.maxAge) === 51 ? "50+" : form.maxAge}</Text></View>
              <Slider accessibilityLabel="Minimum age" minimumValue={18} maximumValue={Math.max(18, Number(form.maxAge) - 1)} step={1} value={Number(form.minAge)} onValueChange={(value) => update("minAge", value)} minimumTrackTintColor="#a682ff" maximumTrackTintColor="#35405d" thumbTintColor="#bd9aff" />
              <Slider accessibilityLabel="Maximum age" minimumValue={Math.min(51, Number(form.minAge) + 1)} maximumValue={51} step={1} value={Number(form.maxAge)} onValueChange={(value) => update("maxAge", value)} minimumTrackTintColor="#ff7692" maximumTrackTintColor="#35405d" thumbTintColor="#ff8aa1" />
              <View style={styles.ageScale}><Text style={styles.ageScaleText}>18</Text><Text style={styles.ageScaleText}>50+</Text></View>
              {errors.age ? <Text style={styles.validationText}>{errors.age}</Text> : null}
            </View>

            {notice ? <Text accessibilityLiveRegion="polite" style={[styles.notice, noticeType === "error" && styles.noticeError]}>{notice}</Text> : null}
            <View style={[styles.footerActions, !isDesktop && styles.footerActionsMobile]}>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => setShowTerminateConfirm(true)} style={[styles.secondaryButton, !isDesktop && styles.mobileActionButton, saving && styles.primaryDisabled]}><Text style={styles.secondaryButtonText}>↪ Terminate Session</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !isDirty || !isValid }} disabled={saving || !isDirty || !isValid} onPress={save} style={({ hovered, pressed }) => [styles.primaryButton, !isDesktop && styles.mobileActionButton, (saving || !isDirty || !isValid) && styles.primaryDisabled, hovered && isDirty && isValid && styles.primaryHover, pressed && styles.pressed]}>{saving ? <ActivityIndicator color="#4e1d31" /> : <Text style={styles.primaryButtonText}>{isDirty ? "Commit Changes ↵" : "Changes Saved ✓"}</Text>}</Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <Modal visible={showTerminateConfirm} transparent animationType="fade" onRequestClose={() => setShowTerminateConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Terminate session?</Text>
            <Text style={styles.confirmCopy}>{isDirty ? "You have uncommitted profile changes. They will be lost if you sign out now." : "You’ll need to sign in again to continue."}</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setShowTerminateConfirm(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
              <Pressable onPress={signOut} style={styles.dangerButton}><Text style={styles.dangerButtonText}>Terminate</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1326" },
  page: { flexGrow: 1, padding: 28 },
  dashboard: { width: "100%", maxWidth: 1120, alignSelf: "center", flexDirection: "row", gap: 26 },
  dashboardMobile: { flexDirection: "column", maxWidth: 620 },
  summaryColumn: { width: 250, gap: 14 },
  summaryColumnMobile: { width: "100%" },
  profileCard: { padding: 22, borderRadius: 14, backgroundColor: "#121c31", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.035)" },
  avatarRing: { width: 126, height: 126, borderRadius: 63, padding: 5, borderWidth: 3, borderColor: "#a37cea", backgroundColor: "#090d19", shadowColor: "#9e76e8", shadowOpacity: 0.35, shadowRadius: 12 },
  avatarHover: { transform: [{ scale: 1.025 }], borderColor: "#ff718c" },
  avatar: { width: "100%", height: "100%", borderRadius: 58 },
  avatarFallback: { flex: 1, borderRadius: 58, backgroundColor: "#202b45", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 46, fontWeight: "900" },
  onlineDot: { position: "absolute", right: 8, bottom: 8, width: 14, height: 14, borderRadius: 7, backgroundColor: "#ff526b", borderWidth: 3, borderColor: "#121c31" },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 63, backgroundColor: "rgba(5,8,16,0.62)", alignItems: "center", justifyContent: "center" },
  profileName: { color: "#dce5ff", fontSize: 24, fontWeight: "900", marginTop: 14 },
  email: { color: "#8e9bb9", fontSize: 11, marginTop: 3 },
  verifiedBadge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,82,107,0.22)" },
  verifiedText: { color: "#ff8ba0", fontSize: 9, fontWeight: "800" },
  avatarActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  miniPrimary: { backgroundColor: "#ff718c", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  miniPrimaryText: { color: "#37131d", fontSize: 10, fontWeight: "900" },
  miniSecondary: { borderWidth: 1, borderColor: "#3a4560", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  miniSecondaryText: { color: "#aeb9d5", fontSize: 10, fontWeight: "800" },
  statsCard: { padding: 18, borderRadius: 12, backgroundColor: "#121c31", borderWidth: 1, borderColor: "rgba(255,255,255,0.035)" },
  cardTitle: { color: "#b5c0dd", fontSize: 13, fontWeight: "800", marginBottom: 16 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  statLabel: { color: "#687490", fontSize: 9, fontWeight: "800" },
  statValue: { color: "#bd9aff", fontSize: 12, fontWeight: "800", marginTop: 4 },
  levelLabel: { color: "#8591af", fontSize: 9, fontWeight: "800" },
  levelLine: { height: 5, borderRadius: 3, backgroundColor: "#2c3752", marginTop: 8, overflow: "hidden" },
  levelFill: { width: "84%", height: "100%", backgroundColor: "#db93df" },
  levelNumber: { color: "#dce5ff", fontSize: 17, fontWeight: "900", marginTop: 8 },
  levelMax: { color: "#697591", fontSize: 11 },
  mainColumn: { flex: 1, minWidth: 0, gap: 16 },
  identityCard: { padding: 22, borderRadius: 14, backgroundColor: "#111a2e", borderWidth: 1, borderColor: "rgba(255,255,255,0.025)" },
  sectionTitle: { color: "#dce5ff", fontSize: 17, fontWeight: "800", marginBottom: 15 },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 13 },
  manageProfileLink: { alignSelf: "flex-start", marginTop: -2, marginBottom: 15, paddingVertical: 5 },
  manageProfileLinkHover: { transform: [{ translateX: 2 }] },
  manageProfileText: { color: "#a88bea", fontSize: 10, fontWeight: "800" },
  fieldWrap: { flexGrow: 1, flexBasis: 240, gap: 6, marginBottom: 12 },
  fieldWide: { flexBasis: "100%" },
  fieldLabel: { color: "#99a5c3", fontSize: 10, fontWeight: "600" },
  field: { minHeight: 42, borderRadius: 7, backgroundColor: "#0d1528", color: "#dce5ff", paddingHorizontal: 13, paddingVertical: 10, fontSize: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.025)" },
  fieldDisabled: { color: "#687490", opacity: 0.8 },
  fieldError: { borderColor: "#ff718c" },
  validationText: { color: "#ff91a5", fontSize: 9, marginTop: 2 },
  bioField: { minHeight: 72, textAlignVertical: "top" },
  interestsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9, marginBottom: 12 },
  interestChip: { backgroundColor: "rgba(135,98,213,0.22)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(160,125,230,0.3)" },
  interestChipHover: { borderColor: "#ff8299", backgroundColor: "rgba(255,82,107,0.14)" },
  interestText: { color: "#c2a7fa", fontSize: 9, fontWeight: "700" },
  addInterest: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "#3b4661" },
  addInterestText: { color: "#9ba7c3", fontSize: 9, fontWeight: "700" },
  interestEditor: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  interestInput: { flex: 1, minHeight: 38, borderRadius: 7, paddingHorizontal: 12, color: "#dce5ff", backgroundColor: "#0d1528", borderWidth: 1, borderColor: "#35405d" },
  interestAddButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#a982ef" },
  interestAddButtonText: { color: "#22152e", fontSize: 10, fontWeight: "900" },
  interestCancel: { color: "#9ba7c3", fontSize: 10, fontWeight: "700" },
  matchCard: { padding: 22, borderRadius: 14, backgroundColor: "#111a2e", borderWidth: 1, borderColor: "rgba(255,255,255,0.025)" },
  matchHeader: { flexDirection: "row", justifyContent: "space-between" },
  filterValue: { color: "#ff95aa", fontSize: 10 },
  genderRow: { flexDirection: "row", marginTop: 9, marginBottom: 20, backgroundColor: "#0d1528", borderRadius: 7, padding: 3 },
  genderOption: { flex: 1, minHeight: 35, alignItems: "center", justifyContent: "center", borderRadius: 5 },
  genderSelected: { backgroundColor: "#50445f", borderWidth: 1, borderColor: "#82647d" },
  genderText: { color: "#8c98b6", fontSize: 10 },
  genderTextSelected: { color: "#ffd6de", fontWeight: "800" },
  ageHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  ageScale: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, marginTop: -4 },
  ageScaleText: { color: "#687490", fontSize: 8 },
  notice: { color: "#ff9aaf", textAlign: "right", fontSize: 12, fontWeight: "700" },
  noticeError: { color: "#ff718c" },
  footerActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingTop: 4 },
  footerActionsMobile: { flexDirection: "column-reverse" },
  mobileActionButton: { width: "100%" },
  secondaryButton: { minHeight: 42, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: "#33405d", backgroundColor: "#0d1528" },
  secondaryButtonText: { color: "#a8b3cf", fontSize: 11, fontWeight: "700" },
  primaryButton: { minHeight: 42, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#ffb1c1" },
  primaryDisabled: { opacity: 0.48 },
  primaryHover: { backgroundColor: "#ffc3cf", transform: [{ translateY: -1 }] },
  primaryButtonText: { color: "#4e1d31", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  confirmOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(4,8,17,0.78)" },
  confirmCard: { width: "100%", maxWidth: 420, borderRadius: 16, padding: 24, backgroundColor: "#121c31", borderWidth: 1, borderColor: "#3a4662" },
  confirmTitle: { color: "#dce5ff", fontSize: 20, fontWeight: "900" },
  confirmCopy: { color: "#9eabc8", fontSize: 13, lineHeight: 20, marginTop: 9 },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  dangerButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  dangerButtonText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});
