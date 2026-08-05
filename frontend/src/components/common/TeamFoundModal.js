import { LinearGradient } from "expo-linear-gradient";
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

function getAvatar(user) {
  return user?.avatarUrl
    || user?.photos?.find((photo) => photo.isPrimary)?.url
    || user?.photos?.[0]?.url
    || null;
}

function ProfileAvatar({ user, style }) {
  const avatarUrl = getAvatar(user);
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={style} />;
  return (
    <View style={[style, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{user?.name?.trim()?.[0]?.toUpperCase() || "G"}</Text>
    </View>
  );
}

export default function TeamFoundModal({
  visible,
  result,
  game,
  onClose,
  onOpenChat,
}) {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const teamMatch = result?.teamMatch;
  const accent = game?.color || "#ff526b";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["#141f38", "#0b1223", "#111529"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, compact && styles.cardCompact, { borderColor: accent, shadowColor: accent }]}
        >
          <View style={[styles.topRail, { backgroundColor: accent }]} />
          <View style={styles.cornerLeft} />
          <View style={styles.cornerRight} />

          <View style={[styles.queueBadge, { borderColor: accent, backgroundColor: `${accent}1f` }]}>
            <View style={[styles.liveDot, { backgroundColor: accent }]} />
            <Text style={[styles.queueBadgeText, { color: accent }]}>MATCHMAKING COMPLETE</Text>
          </View>

          <Text style={[styles.kicker, { color: accent }]}>SQUAD UPDATE // READY CHECK</Text>
          <Text style={[styles.title, compact && styles.titleCompact]}>TEAMMATE FOUND</Text>
          <Text style={styles.teamName} numberOfLines={2}>{teamMatch?.teamName || "Your new squad"}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailChip}><Text style={styles.detailLabel}>GAME</Text><Text style={styles.detailValue}>{game?.label || "Game"}</Text></View>
            <View style={styles.detailChip}><Text style={styles.detailLabel}>SQUAD</Text><Text style={styles.detailValue}>{teamMatch?.teamSize || "-"} PLAYERS</Text></View>
            <View style={styles.detailChip}><Text style={styles.detailLabel}>MODE</Text><Text style={styles.detailValue}>{teamMatch?.playMode === "ranked" ? "RANKED" : "CASUAL"}</Text></View>
          </View>

          <View style={[styles.playersPanel, compact && styles.playersPanelCompact]}>
            <View style={styles.playerCard}>
              <View style={[styles.avatarFrame, { borderColor: accent }]}>
                <ProfileAvatar user={teamMatch?.owner} style={[styles.avatar, compact && styles.avatarCompact]} />
                <View style={[styles.roleBadge, { backgroundColor: accent }]}><Text style={styles.roleBadgeText}>CAPTAIN</Text></View>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{teamMatch?.owner?.name || "Captain"}</Text>
            </View>

            <View style={[styles.linkCore, compact && styles.linkCoreCompact]}>
              <View style={[styles.linkLine, { backgroundColor: accent }]} />
              <View style={[styles.gameCore, { borderColor: accent, backgroundColor: `${accent}24` }]}>
                <Text style={[styles.gameCoreText, { color: accent }]}>{game?.icon || "+"}</Text>
              </View>
              <View style={[styles.linkLine, { backgroundColor: accent }]} />
            </View>

            <View style={styles.playerCard}>
              <View style={[styles.avatarFrame, { borderColor: accent }]}>
                <ProfileAvatar user={teamMatch?.joiner} style={[styles.avatar, compact && styles.avatarCompact]} />
                <View style={[styles.roleBadge, { backgroundColor: accent }]}><Text style={styles.roleBadgeText}>NEW ALLY</Text></View>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{teamMatch?.joiner?.name || "Teammate"}</Text>
            </View>
          </View>

          <Text style={styles.helper}>Your team chat is ready. Coordinate roles, share the lobby code, and queue up.</Text>

          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenChat}
              style={({ hovered, pressed }) => [
                styles.primaryButton,
                { backgroundColor: accent, shadowColor: accent },
                hovered && styles.buttonHover,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>OPEN TEAM CHAT  ›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ hovered, pressed }) => [styles.secondaryButton, { borderColor: `${accent}80` }, hovered && styles.secondaryHover, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>KEEP SEARCHING</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(3,7,16,0.9)" },
  card: { width: "100%", maxWidth: 640, borderWidth: 1, borderRadius: 22, paddingHorizontal: 34, paddingTop: 34, paddingBottom: 28, alignItems: "center", overflow: "hidden", shadowOpacity: 0.38, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  cardCompact: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 20, borderRadius: 18 },
  topRail: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  cornerLeft: { position: "absolute", top: 15, left: 15, width: 26, height: 26, borderLeftWidth: 2, borderTopWidth: 2, borderColor: "rgba(255,255,255,0.16)" },
  cornerRight: { position: "absolute", top: 15, right: 15, width: 26, height: 26, borderRightWidth: 2, borderTopWidth: 2, borderColor: "rgba(255,255,255,0.16)" },
  queueBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  queueBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  kicker: { marginTop: 18, fontSize: 10, fontWeight: "900", letterSpacing: 1.6, textAlign: "center" },
  title: { color: "#f4f7ff", marginTop: 5, fontSize: 38, lineHeight: 43, fontWeight: "900", letterSpacing: -1.1, textAlign: "center" },
  titleCompact: { fontSize: 29, lineHeight: 34 },
  teamName: { color: "#aebbd9", marginTop: 3, fontSize: 16, lineHeight: 21, fontWeight: "800", textAlign: "center" },
  detailsRow: { width: "100%", marginTop: 20, flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  detailChip: { minWidth: 100, flexGrow: 1, flexBasis: 100, maxWidth: 160, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  detailLabel: { color: "#647391", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  detailValue: { color: "#dce5fb", marginTop: 3, fontSize: 10, fontWeight: "900" },
  playersPanel: { width: "100%", marginTop: 24, minHeight: 145, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, backgroundColor: "rgba(3,8,19,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.065)" },
  playersPanelCompact: { paddingHorizontal: 7, minHeight: 124 },
  playerCard: { flex: 1, minWidth: 0, alignItems: "center", gap: 9 },
  avatarFrame: { borderWidth: 2, borderRadius: 18, padding: 4, backgroundColor: "#0a1020" },
  avatar: { width: 88, height: 88, borderRadius: 13 },
  avatarCompact: { width: 66, height: 66, borderRadius: 11 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#263653" },
  avatarInitial: { color: "#ffffff", fontSize: 28, fontWeight: "900" },
  roleBadge: { position: "absolute", left: 8, right: 8, bottom: -8, minHeight: 17, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  roleBadgeText: { color: "#ffffff", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  playerName: { maxWidth: "100%", color: "#f0f4ff", fontSize: 13, fontWeight: "900", textAlign: "center" },
  linkCore: { flexDirection: "row", alignItems: "center", width: 118, marginHorizontal: 4 },
  linkCoreCompact: { width: 72, marginHorizontal: 0 },
  linkLine: { flex: 1, height: 2, opacity: 0.55 },
  gameCore: { width: 43, height: 43, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }] },
  gameCoreText: { fontSize: 19, fontWeight: "900", transform: [{ rotate: "-45deg" }] },
  helper: { maxWidth: 470, color: "#7f8dab", marginTop: 17, fontSize: 11, lineHeight: 17, textAlign: "center" },
  actions: { width: "100%", marginTop: 22, flexDirection: "row", gap: 10 },
  actionsCompact: { flexDirection: "column" },
  primaryButton: { flex: 1.25, minHeight: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  primaryButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.025)" },
  secondaryButtonText: { color: "#aebad4", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  buttonHover: { transform: [{ translateY: -2 }], opacity: 0.92 },
  secondaryHover: { backgroundColor: "rgba(255,255,255,0.07)" },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
