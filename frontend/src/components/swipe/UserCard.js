import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";

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
  const avatarUrl = user?.avatarUrl || primaryPhoto || imageUrl;
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
            <View style={styles.avatarFrame}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            </View>
            <View style={styles.identityCopy}>
              <Text selectable={false} style={styles.name} numberOfLines={1}>
                {user?.name || "New profile"}
                {user?.age ? <Text selectable={false} style={styles.age}> {user.age}</Text> : null}
              </Text>

              {user?.jobTitle || user?.school ? (
                <Text selectable={false} style={styles.meta} numberOfLines={1}>
                  {[user.jobTitle, user.school].filter(Boolean).join(" at ")}
                </Text>
              ) : (
                <Text selectable={false} style={styles.meta} numberOfLines={1}>
                  Profile preview
                </Text>
              )}
            </View>
          </View>

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
    borderRadius: 28,
    backgroundColor: "#111018",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    shadowColor: "#ff4f7b",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    userSelect: "none",
  },
  image: {
    flex: 1,
    justifyContent: "space-between",
  },
  imageRadius: {
    borderRadius: 27,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,6,0.28)",
  },
  topOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
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
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 9,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "rgba(18,16,22,0.72)",
    overflow: "hidden",
    shadowColor: "#050506",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#ffffff",
    fontSize: 30,
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
    margin: 16,
    borderRadius: 18,
    padding: 14,
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
