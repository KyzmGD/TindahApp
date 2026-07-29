import { StyleSheet, Text, TextInput, View } from "react-native";

export default function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#8f8398"
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
    color: "#cbbdd2",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#403449",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#ffffff",
    backgroundColor: "#1c1720",
    fontSize: 16,
    shadowColor: "#050506",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inputError: {
    borderColor: "#ff4f7b",
  },
  error: {
    color: "#ff4f7b",
    fontSize: 12,
  },
});
