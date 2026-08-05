import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export default function Button({ title, onPress, variant = "primary", disabled = false, loading = false, style }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ hovered, pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary
            ? colors.primary
            : isGhost
              ? "transparent"
              : colors.elevated,
          borderColor: isPrimary ? colors.primaryStrong : colors.borderStrong,
          shadowColor: colors.shadow,
        },
        hovered && {
          borderColor: colors.accent,
          shadowColor: colors.accent,
          shadowOpacity: 0.22,
          transform: [{ translateY: -2 }],
        },
        (pressed || disabled || loading) && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={isPrimary ? "#fff" : colors.primary} /> : null}
      {!loading ? (
        <Text
          style={[
            styles.text,
            {
              color: isPrimary ? "#fff" : colors.text,
            },
            isGhost && { color: colors.primary },
          ]}
        >
          {title}
        </Text>
      ) : null}
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
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
