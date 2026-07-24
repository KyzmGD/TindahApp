import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export default function Button({ title, onPress, variant = "primary", disabled = false, loading = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ hovered, pressed }) => [
        styles.base,
        styles[variant],
        hovered && styles.hovered,
        (pressed || disabled || loading) && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? "#fff" : "#ff4458"} /> : null}
      {!loading ? <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: "#ff4458",
  },
  secondary: {
    backgroundColor: "#1d1a1a",
    borderWidth: 1,
    borderColor: "#3a3434",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  hovered: {
    transform: [{ translateY: -1 }],
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: "#ffffff",
  },
  ghostText: {
    color: "#ff4458",
  },
});
