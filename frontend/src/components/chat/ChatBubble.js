import { StyleSheet, Text, View } from "react-native";

export default function ChatBubble({ message, isMine }) {
  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
      <View style={[styles.bubble, isMine ? styles.mine : styles.their]}>
        <Text style={[styles.text, isMine ? styles.mineText : styles.theirText]}>{message.text}</Text>
        {isMine && message.status === "pending" ? (
          <Text style={styles.pendingText}>Sending...</Text>
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
  },
  mine: {
    backgroundColor: "#ff4458",
    borderBottomRightRadius: 6,
  },
  their: {
    backgroundColor: "#f0f1f6",
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
    color: "#202433",
  },
  pendingText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    marginTop: 4,
  },
});
