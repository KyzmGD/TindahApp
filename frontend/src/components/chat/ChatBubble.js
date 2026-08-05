import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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

export default function ChatBubble({ message, isMine, avatarUrl, avatarName, isRead = false, onRetry }) {
  const time = formatMessageTime(message.createdAt);
  const hasImage = Boolean(message.imageUrl);

  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
      {!isMine ? (
        <View style={[styles.senderAvatar, styles.theirAvatar]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.senderAvatarImage} />
          ) : (
            <Text style={styles.senderAvatarText}>{avatarName?.trim()?.charAt(0)?.toUpperCase() || "?"}</Text>
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
            <View style={[styles.metaRow, isMine ? styles.mineMetaRow : styles.theirMetaRow]}>
              <Text style={[styles.timeText, isMine ? styles.mineMetaText : styles.theirMetaText]}>
                {time}
              </Text>
              {isMine && !message.status ? (
                <View
                  accessible
                  accessibilityLabel={isRead ? "Read" : "Unread"}
                  style={styles.receipt}
                >
                  <Text style={[styles.receiptTick, isRead ? styles.receiptRead : styles.receiptUnread]}>✓</Text>
                  <Text style={[styles.receiptTick, styles.receiptTickSecond, isRead ? styles.receiptRead : styles.receiptUnread]}>✓</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {isMine && message.status === "pending" ? (
            <Text style={styles.pendingText}>Sending...</Text>
          ) : null}
          {isMine && message.status === "failed" ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Retry sending message" onPress={() => onRetry?.(message)}><Text style={styles.failedText}>Not sent · Tap to retry</Text></Pressable>
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
    backgroundColor: "#ff526b",
    borderWidth: 1,
    borderColor: "#ff7187",
    borderBottomRightRadius: 10,
  },
  their: {
    backgroundColor: "#18233a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.045)",
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  mineMetaRow: {
    alignSelf: "flex-end",
  },
  theirMetaRow: {
    alignSelf: "flex-end",
  },
  receipt: {
    width: 17,
    height: 12,
    position: "relative",
  },
  receiptTick: {
    position: "absolute",
    left: 0,
    top: -3,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "900",
  },
  receiptTickSecond: {
    left: 6,
  },
  receiptUnread: {
    color: "#ffffff",
  },
  receiptRead: {
    color: "#ff9dca",
  },
  image: {
    width: 210,
    height: 210,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  timeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  mineMetaText: {
    color: "rgba(255,255,255,0.78)",
  },
  theirMetaText: {
    color: "#cbbdd2",
  },
});
