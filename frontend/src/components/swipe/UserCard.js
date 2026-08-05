import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const MAP_ICON = require("../../../assets/figma-explore/map.png");

function formatPresence(user) {
  if (user?.isOnline) return "Online now";
  if (!user?.lastActive) return "Offline";

  const lastActive = new Date(user.lastActive);
  if (Number.isNaN(lastActive.getTime())) return "Offline";
  const elapsed = Date.now() - lastActive.getTime();
  if (elapsed < 60 * 60 * 1000) return `Active ${Math.max(1, Math.floor(elapsed / 60000))}m ago`;
  if (elapsed < 24 * 60 * 60 * 1000) return `Active ${Math.floor(elapsed / 3600000)}h ago`;
  return "Recently active";
}

function buildDetailChips(user) {
  const details = user?.profileDetails || {};
  return [
    details.looking ? { label: "LOOKING FOR", value: details.looking, accent: "pink" } : null,
    details.zodiac ? { label: "ZODIAC", value: details.zodiac, accent: "purple" } : null,
    details.languages?.length ? { label: "LANGUAGES", value: details.languages.slice(0, 2).join(", "), accent: "blue" } : null,
    details.workout ? { label: "WORKOUT", value: details.workout, accent: "green" } : null,
    details.communication ? { label: "COMMUNICATION", value: details.communication, accent: "purple" } : null,
    details.pets?.length ? { label: "PETS", value: details.pets.slice(0, 2).join(", "), accent: "blue" } : null,
  ].filter(Boolean).slice(0, 4);
}

export default function UserCard({ user, style, remaining = 0 }) {
  const primaryPhoto = user?.photos?.find((photo) => photo.isPrimary)?.url || user?.photos?.[0]?.url;
  const imageUrl = primaryPhoto || user?.avatarUrl || null;
  const gamingProfile = user?.gamingProfiles?.[0];
  const interests = (user?.interests || []).slice(0, 4);
  const detailChips = buildDetailChips(user);
  const parsedDistanceKm = Number(user?.distanceKm);
  const distanceText = Number.isFinite(parsedDistanceKm)
    ? `${Math.max(0, Math.round(parsedDistanceKm))} km away`
    : "Distance unavailable";
  const presenceText = formatPresence(user);
  const career = [user?.jobTitle, user?.school].filter(Boolean).join(" • ");
  const education = user?.profileDetails?.education;
  const profileLine = career || education || "";
  const matchScore = Number(user?.matchScore);
  const hasMatchScore = Number.isFinite(matchScore);

  return (
    <View style={[styles.card, style]}>
      <ImageBackground
        source={imageUrl ? { uri: imageUrl } : undefined}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        {!imageUrl ? (
          <View style={styles.profileImageFallback}>
            <Text style={styles.profileImageInitial}>{user?.name?.trim()?.[0]?.toUpperCase() || "U"}</Text>
          </View>
        ) : null}
        <View style={styles.scrim} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(6,14,32,0)", "rgba(6,14,32,0.18)", "rgba(6,14,32,0.78)", "rgba(6,14,32,0.98)"]}
          locations={[0, 0.3, 0.58, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomGradient}
        />

        <View style={styles.topOverlay}>
          <View style={styles.headerBadge}>
            <Text selectable={false} style={styles.badgeText}>{`${remaining} LEFT`}</Text>
          </View>
          <View style={[styles.presenceBadge, user?.isOnline && styles.presenceBadgeOnline]}>
            <View style={[styles.presenceDot, user?.isOnline && styles.presenceDotOnline]} />
            <Text selectable={false} style={[styles.presenceBadgeText, user?.isOnline && styles.presenceBadgeTextOnline]}>
              {user?.isOnline ? "ONLINE" : "ACTIVE"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.identityCopy}>
            <View style={styles.nameRow}>
              <Text selectable={false} style={styles.name} numberOfLines={1}>
                {user?.name || "New profile"}
                {user?.age ? <Text selectable={false} style={styles.age}>, {user.age}</Text> : null}
              </Text>
              {user?.isVerified ? <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View> : null}
            </View>
            <View style={styles.metaRow}>
              <Image source={MAP_ICON} style={styles.metaIcon} resizeMode="contain" />
              <Text selectable={false} style={styles.meta} numberOfLines={1}>{distanceText} • {presenceText}</Text>
            </View>
            {profileLine ? <Text style={styles.profileLine} numberOfLines={1}>{profileLine}</Text> : null}
            {user?.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          </View>

          {gamingProfile ? (
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text selectable={false} style={styles.statLabel}>Main game</Text>
                <Text selectable={false} style={styles.statValuePink} numberOfLines={1}>{gamingProfile.gameName}</Text>
              </View>
              <View style={styles.statTile}>
                <Text selectable={false} style={styles.statLabel}>Rank</Text>
                <Text selectable={false} style={styles.statValuePurple} numberOfLines={1}>{gamingProfile.currentRank}</Text>
              </View>
              <View style={styles.statTile}>
                <Text selectable={false} style={styles.statLabel}>{gamingProfile.inGameID ? "Game ID" : hasMatchScore ? "Match" : "Lobby"}</Text>
                <Text selectable={false} style={styles.statValueBlue} numberOfLines={1}>
                  {gamingProfile.inGameID || (hasMatchScore ? `${Math.round(matchScore)}%` : gamingProfile.lobbyGroup?.replace("group", "Group "))}
                </Text>
              </View>
            </View>
          ) : null}

          {detailChips.length ? (
            <View style={styles.detailsRow}>
              {detailChips.map((detail) => (
                <View key={`${detail.label}-${detail.value}`} style={[styles.detailChip, styles[`detailChip_${detail.accent}`]]}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{detail.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {interests.length ? (
            <View style={styles.interestsRow}>
              {interests.map((interest) => (
                <View key={interest} style={styles.interestChip}><Text style={styles.interestText}>#{interest}</Text></View>
              ))}
            </View>
          ) : null}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 32, backgroundColor: "#222a3d", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", shadowColor: "#ff5167", shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5, userSelect: "none" },
  image: { flex: 1, justifyContent: "space-between" },
  imageRadius: { borderRadius: 31 },
  profileImageFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#26334d" },
  profileImageInitial: { color: "#dae2fd", fontSize: 96, fontWeight: "900" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,14,32,0.04)" },
  bottomGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "88%" },
  topOverlay: { flexDirection: "row", justifyContent: "space-between", padding: 14, zIndex: 2 },
  headerBadge: { backgroundColor: "rgba(6,14,32,0.84)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  badgeText: { color: "#ffffff", fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
  presenceBadge: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "rgba(170,184,214,0.3)", backgroundColor: "rgba(6,14,32,0.84)" },
  presenceBadgeOnline: { borderColor: "rgba(32,228,155,0.48)" },
  presenceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#77839e" },
  presenceDotOnline: { backgroundColor: "#20e49b" },
  presenceBadgeText: { color: "#aab6cf", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  presenceBadgeTextOnline: { color: "#72f3c2" },
  content: { paddingHorizontal: 22, paddingBottom: 44, gap: 11, zIndex: 2 },
  identityCopy: { minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, color: "#f0f3ff", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -0.6 },
  age: { fontWeight: "600" },
  verifiedBadge: { width: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#7f69e8" },
  verifiedText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  metaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 7 },
  metaIcon: { width: 11, height: 14, tintColor: "#c0c1ff" },
  meta: { color: "#b8c0dc", fontSize: 12, lineHeight: 16, flexShrink: 1 },
  profileLine: { color: "#d9def0", marginTop: 7, fontSize: 12, fontWeight: "800" },
  bio: { color: "#aeb8d1", marginTop: 6, fontSize: 11, lineHeight: 16 },
  statsGrid: { flexDirection: "row", gap: 6 },
  statTile: { flex: 1, minWidth: 0, minHeight: 58, borderRadius: 12, backgroundColor: "rgba(11,19,38,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.065)", justifyContent: "center", paddingHorizontal: 9 },
  statLabel: { color: "#76839f", fontSize: 7, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  statValuePink: { marginTop: 4, color: "#ff9bae", fontSize: 11, fontWeight: "900" },
  statValuePurple: { marginTop: 4, color: "#d2afff", fontSize: 11, fontWeight: "900" },
  statValueBlue: { marginTop: 4, color: "#bfc8ff", fontSize: 11, fontWeight: "900" },
  detailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  detailChip: { maxWidth: "49%", flexGrow: 1, flexBasis: 135, minHeight: 34, borderRadius: 9, borderWidth: 1, justifyContent: "center", paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "rgba(11,19,38,0.72)" },
  detailChip_pink: { borderColor: "rgba(255,82,107,0.26)" },
  detailChip_purple: { borderColor: "rgba(169,138,233,0.28)" },
  detailChip_blue: { borderColor: "rgba(112,168,255,0.27)" },
  detailChip_green: { borderColor: "rgba(32,228,155,0.25)" },
  detailLabel: { color: "#697691", fontSize: 6, fontWeight: "900", letterSpacing: 0.7 },
  detailValue: { color: "#d9e0f3", marginTop: 2, fontSize: 9, fontWeight: "800" },
  interestsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  interestChip: { minHeight: 25, borderRadius: 999, justifyContent: "center", paddingHorizontal: 9, backgroundColor: "rgba(126,102,219,0.18)", borderWidth: 1, borderColor: "rgba(177,151,255,0.22)" },
  interestText: { color: "#c9b9f7", fontSize: 8, fontWeight: "800" },
});
