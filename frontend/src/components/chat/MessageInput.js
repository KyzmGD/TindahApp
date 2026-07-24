import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function MessageInput({ disabled = false, onSend, onTyping }) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
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
        placeholderTextColor="#777171"
        editable={!disabled}
        style={[styles.input, disabled && styles.inputDisabled]}
        multiline
      />
      <Pressable
        onPress={submit}
        disabled={disabled || !text.trim()}
        style={({ hovered, pressed }) => [
          styles.send,
          hovered && styles.hovered,
          (pressed || disabled || !text.trim()) && styles.pressed,
        ]}
      >
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
    borderTopColor: "#272020",
    backgroundColor: "#101010",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#1d1a1a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.65,
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
    transform: [{ scale: 0.96 }],
  },
  hovered: {
    transform: [{ translateY: -1 }],
  },
  sendText: {
    color: "#fff",
    fontWeight: "800",
  },
});
