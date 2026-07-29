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
        placeholderTextColor="#8f8398"
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
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#1f1b22",
    backgroundColor: "#050506",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#2c2334",
    backgroundColor: "#151219",
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  send: {
    minWidth: 58,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4f7b",
    borderWidth: 1,
    borderColor: "#ff7aa2",
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
