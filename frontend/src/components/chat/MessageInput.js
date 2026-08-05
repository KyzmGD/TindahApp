import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../../services/upload.api";

export default function MessageInput({ disabled = false, onError, onSend, onSendImage, onTyping }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    onTyping?.(false);
    onSend(trimmed);
  };

  const chooseImage = async () => {
    if (disabled || uploading) return;
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
      });
      if (!result.canceled) {
        const url = await uploadImage(result.assets[0]);
        await onSendImage?.(url);
      }
    } catch (error) {
      onError?.(error.message || "Could not attach that image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add image" accessibilityState={{ disabled: disabled || uploading }} disabled={disabled || uploading} onPress={chooseImage} style={({ hovered, pressed }) => [styles.iconButton, (disabled || uploading) && styles.controlDisabled, hovered && styles.iconHover, pressed && styles.pressed]}>
        {uploading ? <ActivityIndicator color="#aeb9d5" size="small" /> : <Text style={styles.plusIcon}>＋</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose photo" accessibilityState={{ disabled: disabled || uploading }} disabled={disabled || uploading} onPress={chooseImage} style={({ hovered, pressed }) => [styles.smallIconButton, (disabled || uploading) && styles.controlDisabled, hovered && styles.iconHover, pressed && styles.pressed]}>
        <Text style={styles.photoIcon}>▣</Text>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          onTyping?.(value.length > 0);
        }}
        onSubmitEditing={submit}
        placeholder="Type a message..."
        placeholderTextColor="#687490"
        editable={!disabled}
        maxLength={2000}
        accessibilityLabel="Message"
        style={[styles.input, disabled && styles.inputDisabled]}
        multiline
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Add emoji" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { setText((current) => `${current}🙂`); onTyping?.(true); }} style={({ hovered, pressed }) => [styles.smallIconButton, disabled && styles.controlDisabled, hovered && styles.iconHover, pressed && styles.pressed]}>
        <Text style={styles.emojiIcon}>☺</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Send message"
        onPress={submit}
        disabled={disabled || !text.trim()}
        style={({ hovered, pressed }) => [styles.send, hovered && styles.sendHovered, (pressed || disabled || !text.trim()) && styles.pressed]}
      >
        <Text style={styles.sendText}>➤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: "#26324c", backgroundColor: "#0e172a" },
  input: { flex: 1, maxHeight: 100, minHeight: 34, color: "#dce5ff", paddingHorizontal: 5, paddingVertical: 7, fontSize: 12 },
  inputDisabled: { opacity: 0.6 },
  controlDisabled: { opacity: 0.42 },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#39455f" },
  smallIconButton: { width: 26, height: 32, alignItems: "center", justifyContent: "center" },
  iconHover: { backgroundColor: "#1c2840" },
  plusIcon: { color: "#aeb9d5", fontSize: 18, lineHeight: 20 },
  photoIcon: { color: "#8997b7", fontSize: 15 },
  emojiIcon: { color: "#aeb9d5", fontSize: 18 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  sendHovered: { backgroundColor: "#ff7085", transform: [{ translateY: -1 }] },
  pressed: { opacity: 0.62, transform: [{ scale: 0.94 }] },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "900", marginLeft: 2 },
});
