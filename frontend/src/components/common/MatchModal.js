import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";

export default function MatchModal({
  visible,
  currentUser,
  matchedUser,
  onClose,
  onMessage,
}) {
    console.log("currentUser", currentUser);
console.log("matchedUser", matchedUser);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            It's a Match!
          </Text>

          <Text style={styles.subtitle}>
            You and {matchedUser?.name} liked each other
          </Text>

          <View style={styles.avatarRow}>
            <Image
  source={{
    uri: getAvatar(currentUser),
  }}
  style={styles.avatar}
/>

<Image
  source={{
    uri: getAvatar(matchedUser),
  }}
  style={[
    styles.avatar,
    styles.secondAvatar,
  ]}
/>
          </View>

          <Pressable
            style={styles.messageButton}
            onPress={onMessage}
          >
            <Text style={styles.messageText}>
              Gửi tin nhắn ngay
            </Text>
          </Pressable>

          <Pressable
            style={styles.continueButton}
            onPress={onClose}
          >
            <Text style={styles.continueText}>
              Tiếp tục quẹt
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const getAvatar = (user) => {
  if (!user?.photos?.length) {
    return "https://i.pravatar.cc/300";
  }

  const primary = user.photos.find(
    (photo) => photo.isPrimary
  );

  return primary?.url || user.photos[0]?.url;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ff4458",
  },

  subtitle: {
    marginTop: 10,
    textAlign: "center",
    color: "#666",
  },

  avatarRow: {
    flexDirection: "row",
    marginVertical: 28,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  secondAvatar: {
    marginLeft: -20,
  },

  messageButton: {
    width: "100%",
    backgroundColor: "#ff4458",
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
    color: "#666",
    fontWeight: "700",
  },
});