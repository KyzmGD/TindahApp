import { ImageBackground, StyleSheet, Text, View } from "react-native";

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
  const extraTags = ["NON-SMOKER"];

  return (
    <View style={[styles.card, style]}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        <View style={styles.scrim} />

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
          <View style={styles.profileRow}>
            <Text selectable={false} style={styles.name} numberOfLines={1}>
              {user?.name || "New profile"}
              {user?.age ? <Text selectable={false} style={styles.age}> {user.age}</Text> : null}
            </Text>
          </View>

          {user?.jobTitle || user?.school ? (
            <Text selectable={false} style={styles.meta} numberOfLines={1}>
              {[user.jobTitle, user.school].filter(Boolean).join(" at ")}
            </Text>
          ) : null}

          <View style={styles.tagRow}>
            {interests.map((interest) => (
              <View key={interest} style={styles.tagBubble}>
                <Text selectable={false} style={styles.tagBubbleText}>{interest}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tagRowBottom}>
            {extraTags.map((tag) => (
              <View key={tag} style={styles.tagBubbleSecondary}>
                <Text selectable={false} style={styles.tagBubbleSecondaryText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.promptCard}>
          <Text selectable={false} style={styles.promptText} numberOfLines={2}>
            {user?.bio || "No bio yet. Start the conversation."}
          </Text>
          <View style={styles.commentButton}>
            <Text selectable={false} style={styles.commentText}>Comment...</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: "#111018",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(32,199,255,0.16)",
    shadowColor: "#20c7ff",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    userSelect: "none",
  },
  image: {
    flex: 1,
    justifyContent: "space-between",
  },
  imageRadius: {
    borderRadius: 21,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,6,0.38)",
  },
  topOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    zIndex: 2,
  },
  headerBadge: {
    backgroundColor: "rgba(18,16,22,0.84)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
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
    backgroundColor: "rgba(18,16,22,0.84)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.5)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  matchScore: {
    color: "#ffd166",
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
    paddingHorizontal: 22,
    paddingBottom: 14,
    gap: 10,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
  },
  age: {
    fontWeight: "500",
  },
  meta: {
    color: "#f3f4f8",
    fontSize: 15,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagRowBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagBubble: {
    backgroundColor: "rgba(18,16,22,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,79,123,0.26)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagBubbleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  tagBubbleSecondary: {
    backgroundColor: "rgba(18,16,22,0.72)",
    borderWidth: 1,
    borderColor: "rgba(32,199,255,0.24)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagBubbleSecondaryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  promptCard: {
    backgroundColor: "rgba(18,16,22,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    margin: 20,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  promptText: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
  },
  commentButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
  },
});
