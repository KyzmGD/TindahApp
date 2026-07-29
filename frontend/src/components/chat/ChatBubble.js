import { Image, StyleSheet, Text, View } from "react-native";

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatBubble({ message, isMine, avatarUrl }) {
  const time = formatMessageTime(message.createdAt);
  const hasImage = Boolean(message.imageUrl);

  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
      {!isMine ? (
        <View style={[styles.senderAvatar, styles.theirAvatar]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.senderAvatarImage} />
          ) : (
            <Text style={styles.senderAvatarText}>T</Text>
          )}
        </View>
      ) : null}
      <View style={styles.bubbleWrap}>
        <View style={[styles.bubble, isMine ? styles.mine : styles.their]}>
          {hasImage ? (
            <Image source={{ uri: message.imageUrl }} style={styles.image} />
          ) : null}
          {message.text ? (
            <Text style={[styles.text, isMine ? styles.mineText : styles.theirText]}>
              {message.text}
            </Text>
          ) : null}
          {time ? (
            <Text style={[styles.timeText, isMine ? styles.mineMetaText : styles.theirMetaText]}>
              {time}
            </Text>
          ) : null}
          {isMine && message.status === "pending" ? (
            <Text style={styles.pendingText}>Sending...</Text>
          ) : null}
          {isMine && message.status === "failed" ? (
            <Text style={styles.failedText}>Not sent</Text>
          ) : null}
        </View>
      </View>
      {isMine ? (
        <View style={[styles.senderAvatar, styles.mineAvatar]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.senderAvatarImage} />
          ) : (
            <Text style={styles.senderAvatarText}>Me</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 7,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 8,
  },
  mineRow: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  theirRow: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  bubbleWrap: {
    maxWidth: "74%",
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#ff4f7b",
    borderWidth: 1,
    borderColor: "#ff7aa2",
    marginBottom: 2,
  },
  theirAvatar: {
    backgroundColor: "#ff4f7b",
  },
  mineAvatar: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#1c1720",
  },
  senderAvatarImage: {
    width: "100%",
    height: "100%",
  },
  senderAvatarText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  bubble: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 7,
    shadowColor: "#050506",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  mine: {
    backgroundColor: "#0b0b0d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomRightRadius: 10,
  },
  their: {
    backgroundColor: "#020203",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderBottomLeftRadius: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 23,
  },
  mineText: {
    color: "#ffffff",
  },
  theirText: {
    color: "#ffffff",
  },
  pendingText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    marginTop: 4,
  },
  failedText: {
    color: "#ffe7eb",
    fontSize: 11,
    marginTop: 4,
  },
  image: {
    width: 210,
    height: 210,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  timeText: {
    alignSelf: "flex-end",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  mineMetaText: {
    color: "rgba(255,255,255,0.78)",
  },
  theirMetaText: {
    color: "#cbbdd2",
  },
});
