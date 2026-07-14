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
    user?.interests || ["Hẹn hò", "Cà phê", "Nhạc indie"]
  ).slice(0, 3);
  const extraTags = ["KHÔNG HÚT THUỐC"];

  return (
    <View style={[styles.card, style]}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.image}
        imageStyle={styles.imageRadius}
      >
        <View style={styles.scrim} />

        <View style={styles.topOverlay}>
          <View style={styles.headerBadge}>
            <Text selectable={false} style={styles.badgeText}>{`${remaining} LEFT`}</Text>
          </View>
          <View style={styles.matchBadge}>
            <Text selectable={false} style={styles.matchScore}>{matchScore}%</Text>
            <Text selectable={false} style={styles.matchLabel}>TƯƠNG HỢP</Text>
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
            {user?.bio || "Chưa có giới thiệu, hãy thử bắt chuyện!"}
          </Text>
          <View style={styles.commentButton}>
            <Text selectable={false} style={styles.commentText}>Bình luận...</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
  borderRadius: 22,
  backgroundColor: "#111",
  overflow: "hidden",
  shadowColor: "#1b1d28",
  shadowOpacity: 0.18,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,

  // Web fixes
  userSelect: "none",
  },
  image: {
    flex: 1,
    justifyContent: "space-between",
  },
  imageRadius: {
    borderRadius: 22,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  topOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    zIndex: 2,
  },
  headerBadge: {
  backgroundColor: "rgba(255,255,255,0.35)",
  borderRadius: 14,
  paddingHorizontal: 8,
  paddingVertical: 4,

  alignSelf: "flex-start",
},
 badgeText: {
  color: "#fff",
  fontWeight: "800",
  fontSize: 13,
},
  matchBadge: {
  backgroundColor: "rgba(255,255,255,0.35)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  borderRadius: 18,
  paddingHorizontal: 12,
  paddingVertical: 6,
  alignItems: "center",
},
  matchScore: {
  color: "#fff",
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
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  age: {
    fontWeight: "600",
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
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagBubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  tagBubbleSecondary: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagBubbleSecondaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  promptCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    margin: 20,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  promptText: {
    color: "#1d2233",
    fontSize: 14,
    flex: 1,
  },
  commentButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
});
