import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const getAvatar = (user) => {
  if (user?.avatarUrl) {
    return user.avatarUrl;
  }

  if (!user?.photos?.length) {
    return "https://i.pravatar.cc/300";
  }

  const primary = user.photos.find((photo) => photo.isPrimary);
  return primary?.url || user.photos[0]?.url;
};

export default function MatchModal({
  visible,
  currentUser,
  matchedUser,
  onClose,
  onMessage,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>It's a Match!</Text>

          <Text style={styles.subtitle}>
            You and {matchedUser?.name} liked each other
          </Text>

          <View style={styles.avatarRow}>
            <Image
              source={{ uri: getAvatar(currentUser) }}
              style={styles.avatar}
            />
            <Image
              source={{ uri: getAvatar(matchedUser) }}
              style={[styles.avatar, styles.secondAvatar]}
            />
          </View>

          <Pressable style={styles.messageButton} onPress={onMessage}>
            <Text style={styles.messageText}>Send a message</Text>
          </Pressable>

          <Pressable style={styles.continueButton} onPress={onClose}>
            <Text style={styles.continueText}>Keep swiping</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,6,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    backgroundColor: "#121016",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.32)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#ff4f7b",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ff4f7b",
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    color: "#cbbdd2",
  },
  avatarRow: {
    flexDirection: "row",
    marginVertical: 28,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "#ffd166",
  },
  secondAvatar: {
    marginLeft: -20,
  },
  messageButton: {
    width: "100%",
    backgroundColor: "#ff4f7b",
    borderWidth: 1,
    borderColor: "#ff7aa2",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  messageText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  continueButton: {
    marginTop: 12,
  },
  continueText: {
    color: "#cbbdd2",
    fontWeight: "700",
  },
});
