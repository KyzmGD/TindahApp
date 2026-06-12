import { ImageBackground, StyleSheet, Text, View } from "react-native";

const fallbackImages = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
];

export default function UserCard({ user, style }) {
  const primaryPhoto = user?.photos?.find((photo) => photo.isPrimary)?.url || user?.photos?.[0]?.url;
  const imageUrl = primaryPhoto || fallbackImages[Math.abs((user?.name || "A").charCodeAt(0)) % fallbackImages.length];

  return (
    <View style={[styles.card, style]}>
      <ImageBackground source={{ uri: imageUrl }} style={styles.image} imageStyle={styles.imageRadius}>
        <View style={styles.scrim} />
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || "New profile"}
            {user?.age ? <Text style={styles.age}> {user.age}</Text> : null}
          </Text>
          {user?.jobTitle || user?.school ? (
            <Text style={styles.meta} numberOfLines={1}>
              {[user.jobTitle, user.school].filter(Boolean).join(" at ")}
            </Text>
          ) : null}
          {user?.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
              {user.bio}
            </Text>
          ) : null}
          <View style={styles.tags}>
            {(user?.interests || []).slice(0, 3).map((interest) => (
              <Text key={interest} style={styles.tag}>
                {interest}
              </Text>
            ))}
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
  },
  image: {
    flex: 1,
    justifyContent: "flex-end",
  },
  imageRadius: {
    borderRadius: 22,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  content: {
    padding: 22,
    gap: 8,
  },
  name: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  age: {
    fontWeight: "500",
  },
  meta: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  bio: {
    color: "#f3f4f8",
    fontSize: 14,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "700",
  },
});
