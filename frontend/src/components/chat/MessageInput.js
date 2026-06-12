import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    onTyping?.(false);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          onTyping?.(value.length > 0);
        }}
        placeholder="Message"
        placeholderTextColor="#8c8f9f"
        style={styles.input}
        multiline
      />
      <Pressable onPress={submit} style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
        <Text style={styles.sendText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#ececf2",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#f4f5f9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#171a25",
    fontSize: 15,
  },
  send: {
    minWidth: 64,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4458",
  },
  pressed: {
    opacity: 0.75,
  },
  sendText: {
    color: "#fff",
    fontWeight: "800",
  },
});
