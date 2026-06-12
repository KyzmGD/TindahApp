import { StyleSheet, Text, TextInput, View } from "react-native";

export default function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#8c8f9f"
        autoCapitalize="none"
        style={[styles.input, error && styles.inputError, inputStyle]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: "#606473",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#e3e4eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#171a25",
    backgroundColor: "#fff",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ff4458",
  },
  error: {
    color: "#ff4458",
    fontSize: 12,
  },
});
