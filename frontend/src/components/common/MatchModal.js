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

export default function MatchModal({ visible, currentUser, matchedUser, onClose, onMessage }) {
  const { width } = useWindowDimensions();
  const compact = width < 520;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["#1b1730", "#0b1223", "#151329"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, compact && styles.cardCompact]}
        >
          <View style={styles.topRail} />
          <View style={styles.cornerLeft} />
          <View style={styles.cornerRight} />

          <View style={styles.queueBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.queueBadgeText}>DUO CONNECTION ESTABLISHED</Text>
          </View>
          <Text style={styles.kicker}>MATCHMAKING // COMPLETE</Text>
          <Text style={[styles.title, compact && styles.titleCompact]}>IT&apos;S A MATCH!</Text>
          <Text style={styles.subtitle}>You and {matchedUser?.name || "this player"} both hit like. Your private chat is ready.</Text>

          <View style={[styles.playersPanel, compact && styles.playersPanelCompact]}>
            <View style={styles.playerCard}>
              <Text style={styles.playerNumber}>PLAYER 01</Text>
              <View style={styles.avatarFrame}>
                <ProfileAvatar user={currentUser} style={[styles.avatar, compact && styles.avatarCompact]} />
                <View style={styles.readyBadge}><Text style={styles.readyBadgeText}>READY</Text></View>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{currentUser?.name || "You"}</Text>
            </View>

            <View style={[styles.matchCoreWrap, compact && styles.matchCoreWrapCompact]}>
              <View style={styles.matchLine} />
              <View style={styles.matchCore}><Text style={styles.matchCoreText}>VS</Text></View>
              <View style={styles.matchLine} />
            </View>

            <View style={styles.playerCard}>
              <Text style={styles.playerNumber}>PLAYER 02</Text>
              <View style={styles.avatarFrame}>
                <ProfileAvatar user={matchedUser} style={[styles.avatar, compact && styles.avatarCompact]} />
                <View style={styles.readyBadge}><Text style={styles.readyBadgeText}>READY</Text></View>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{matchedUser?.name || "Player"}</Text>
            </View>
          </View>

          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Pressable
              accessibilityRole="button"
              onPress={onMessage}
              style={({ hovered, pressed }) => [styles.messageButton, hovered && styles.buttonHover, pressed && styles.buttonPressed]}
            >
              <Text style={styles.messageText}>OPEN MATCH CHAT  ›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ hovered, pressed }) => [styles.continueButton, hovered && styles.continueHover, pressed && styles.buttonPressed]}
            >
              <Text style={styles.continueText}>KEEP EXPLORING</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(3,6,15,0.91)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 620, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,82,107,0.72)", paddingHorizontal: 34, paddingTop: 34, paddingBottom: 28, alignItems: "center", overflow: "hidden", shadowColor: "#ff526b", shadowOpacity: 0.38, shadowRadius: 34, shadowOffset: { width: 0, height: 17 }, elevation: 16 },
  cardCompact: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 20, borderRadius: 18 },
  topRail: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "#ff526b" },
  cornerLeft: { position: "absolute", top: 15, left: 15, width: 26, height: 26, borderLeftWidth: 2, borderTopWidth: 2, borderColor: "rgba(255,82,107,0.48)" },
  cornerRight: { position: "absolute", top: 15, right: 15, width: 26, height: 26, borderRightWidth: 2, borderTopWidth: 2, borderColor: "rgba(255,82,107,0.48)" },
  queueBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "rgba(255,82,107,0.55)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,82,107,0.1)" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ff526b" },
  queueBadgeText: { color: "#ff8aa0", fontSize: 9, fontWeight: "900", letterSpacing: 1.05 },
  kicker: { color: "#a98ae9", marginTop: 18, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#f7f4ff", marginTop: 4, fontSize: 40, lineHeight: 45, fontWeight: "900", letterSpacing: -1.2, textAlign: "center" },
  titleCompact: { fontSize: 31, lineHeight: 36 },
  subtitle: { maxWidth: 450, marginTop: 8, textAlign: "center", color: "#8f9cba", fontSize: 12, lineHeight: 18 },
  playersPanel: { width: "100%", marginTop: 24, minHeight: 168, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, backgroundColor: "rgba(3,8,19,0.52)", borderWidth: 1, borderColor: "rgba(255,255,255,0.065)" },
  playersPanelCompact: { minHeight: 142, paddingHorizontal: 7 },
  playerCard: { flex: 1, minWidth: 0, alignItems: "center", gap: 8 },
  playerNumber: { color: "#657492", fontSize: 7, fontWeight: "900", letterSpacing: 1.2 },
  avatarFrame: { borderWidth: 2, borderColor: "#ff526b", borderRadius: 18, padding: 4, backgroundColor: "#0a1020" },
  avatar: { width: 94, height: 94, borderRadius: 13 },
  avatarCompact: { width: 68, height: 68, borderRadius: 11 },
  avatarFallback: { backgroundColor: "#293754", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#ffffff", fontSize: 30, fontWeight: "900" },
  readyBadge: { position: "absolute", left: 8, right: 8, bottom: -8, minHeight: 17, borderRadius: 3, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  readyBadgeText: { color: "#ffffff", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  playerName: { maxWidth: "100%", color: "#f0f4ff", fontSize: 13, fontWeight: "900", textAlign: "center" },
  matchCoreWrap: { flexDirection: "row", alignItems: "center", width: 120, marginHorizontal: 3 },
  matchCoreWrapCompact: { width: 72, marginHorizontal: 0 },
  matchLine: { flex: 1, height: 2, backgroundColor: "rgba(255,82,107,0.46)" },
  matchCore: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#ff526b", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,82,107,0.14)", transform: [{ rotate: "45deg" }] },
  matchCoreText: { color: "#ff7890", fontSize: 11, fontWeight: "900", transform: [{ rotate: "-45deg" }] },
  actions: { width: "100%", marginTop: 24, flexDirection: "row", gap: 10 },
  actionsCompact: { flexDirection: "column" },
  messageButton: { flex: 1.2, minHeight: 49, backgroundColor: "#ff526b", borderRadius: 8, alignItems: "center", justifyContent: "center", shadowColor: "#ff526b", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  messageText: { color: "#ffffff", fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },
  continueButton: { flex: 1, minHeight: 49, borderRadius: 8, borderWidth: 1, borderColor: "rgba(169,138,233,0.55)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.025)" },
  continueText: { color: "#b4a3df", fontSize: 10, fontWeight: "900", letterSpacing: 0.75 },
  buttonHover: { transform: [{ translateY: -2 }], opacity: 0.92 },
  continueHover: { backgroundColor: "rgba(169,138,233,0.1)" },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
