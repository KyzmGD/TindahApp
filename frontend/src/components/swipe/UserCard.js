import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const MAP_ICON = require("../../../assets/figma-explore/map.png");
const CLOCK_ICON = require("../../../assets/figma-explore/clock.png");

const fallbackImages = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
];

export default function UserCard({ user, style, remaining = 0 }) {
  const primaryPhoto =
    user?.photos?.find((photo) => photo.isPrimary)?.url ||
    user?.photos?.[0]?.url;
  const imageUrl =
    primaryPhoto ||
    fallbackImages[
      Math.abs((user?.name || "A").charCodeAt(0)) % fallbackImages.length
    ];
  const matchScore = user?.matchScore ?? 92;
  const interests = (
    user?.interests || ["Dating", "Coffee", "Indie music"]
  ).slice(0, 3);
  const gamingProfile = user?.gamingProfiles?.[0];
  const mainGame = gamingProfile?.gameName || interests[0] || "Dating";
  const rank = gamingProfile?.currentRank || "Ready";
  const winRate = user?.winRate ? `${user.winRate}%` : `${matchScore}%`;
  const playTime = user?.preferredPlayTime || "Late Night";
  const parsedDistanceKm = Number(user?.distanceKm);
  const distanceKm = Number.isFinite(parsedDistanceKm)
    ? Math.max(0, Math.round(parsedDistanceKm))
    : 2;

  return (
    <View style={[styles.card, style]}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        <View style={styles.scrim} />
        <View style={styles.colorScrim} />
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(6,14,32,0)",
            "rgba(6,14,32,0.12)",
            "rgba(6,14,32,0.46)",
            "rgba(6,14,32,0.76)",
          ]}
          locations={[0, 0.32, 0.68, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomGradient}
        />

        <View style={styles.topOverlay}>
          <View style={styles.headerBadge}>
            <Text selectable={false} style={styles.badgeText}>{`${remaining} LEFT`}</Text>
          </View>
          <View style={styles.matchBadge}>
            <Text selectable={false} style={styles.matchScore}>{matchScore}%</Text>
            <Text selectable={false} style={styles.matchLabel}>MATCH</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.identityCopy}>
            <Text selectable={false} style={styles.name} numberOfLines={1}>
              {user?.name || "New profile"}
              {user?.age ? <Text selectable={false} style={styles.age}>, {user.age}</Text> : null}
            </Text>
            <View style={styles.metaRow}>
              <Image source={MAP_ICON} style={styles.metaIcon} resizeMode="contain" />
              <Text selectable={false} style={styles.meta} numberOfLines={1}>
                {`${distanceKm} km away \u2022 Online now`}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text selectable={false} style={styles.statLabel}>Main game</Text>
              <Text selectable={false} style={styles.statValuePink} numberOfLines={1}>{mainGame}</Text>
            </View>
            <View style={styles.statTile}>
              <Text selectable={false} style={styles.statLabel}>Rank</Text>
              <Text selectable={false} style={styles.statValuePurple} numberOfLines={1}>{rank}</Text>
            </View>
            <View style={styles.statTile}>
              <Text selectable={false} style={styles.statLabel}>Win rate</Text>
              <Text selectable={false} style={styles.statValueBlue}>{winRate}</Text>
            </View>
          </View>

          <View style={styles.playTimeTag}>
            <Image source={CLOCK_ICON} style={styles.playTimeIcon} resizeMode="contain" />
            <Text selectable={false} style={styles.playTimeText} numberOfLines={1}>{playTime}</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    backgroundColor: "#222a3d",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#ff5167",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    userSelect: "none",
  },
  image: {
    flex: 1,
    justifyContent: "space-between",
  },
  imageRadius: {
    borderRadius: 31,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,14,32,0.06)",
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "74%",
  },
  colorScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(49,49,192,0.08)",
  },
  topOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    zIndex: 2,
  },
  headerBadge: {
    backgroundColor: "rgba(6,14,32,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  matchBadge: {
    backgroundColor: "rgba(6,14,32,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,179,181,0.46)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  matchScore: {
    color: "#ffb3b5",
    fontWeight: "900",
    fontSize: 16,
  },
  matchLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 42,
    gap: 16,
    zIndex: 2,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#dae2fd",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0,
  },
  age: {
    fontWeight: "700",
  },
  meta: {
    color: "#c0c1ff",
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "400",
    flexShrink: 1,
  },
  metaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaIcon: {
    width: 12,
    height: 15,
    tintColor: "#c0c1ff",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  statTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "rgba(11,19,38,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  statLabel: {
    color: "#e6bcbd",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statValuePink: {
    marginTop: 5,
    color: "#ffb3b5",
    fontSize: 14,
    fontWeight: "900",
  },
  statValuePurple: {
    marginTop: 5,
    color: "#ddb7ff",
    fontSize: 14,
    fontWeight: "900",
  },
  statValueBlue: {
    marginTop: 3,
    color: "#c0c1ff",
    fontSize: 24,
    fontWeight: "900",
  },
  playTimeTag: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(6,14,32,0.78)",
    borderWidth: 1,
    borderColor: "rgba(192,193,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  playTimeIcon: {
    width: 14,
    height: 14,
    tintColor: "#c0c1ff",
  },
  playTimeText: {
    color: "#dae2fd",
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
});
