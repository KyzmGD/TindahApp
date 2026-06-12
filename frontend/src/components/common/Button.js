import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export default function Button({ title, onPress, variant = "primary", disabled = false, loading = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e8ef",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.72,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: "#1d2233",
  },
  ghostText: {
    color: "#ff4458",
  },
});
