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

export default function ChatBubble({ message, isMine }) {
  const time = formatMessageTime(message.createdAt);
  const hasImage = Boolean(message.imageUrl);

  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
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
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  mineRow: {
    alignItems: "flex-end",
  },
  theirRow: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  mine: {
    backgroundColor: "#ff4458",
    borderBottomRightRadius: 6,
  },
  their: {
    backgroundColor: "#1d1a1a",
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: "#fff",
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
    backgroundColor: "rgba(255,255,255,0.08)",
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
    color: "#bfb8b8",
  },
});
