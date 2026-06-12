import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ChatBubble from "../components/chat/ChatBubble";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getMessages, sendMessage } from "../services/swipe.api";

export default function ChatScreen({ navigation, route }) {
  const { user: currentUser } = useAuth();
  const { socket, joinMatch, setTyping } = useSocket();
  const { match, user } = route.params;
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);

  const matchId = match._id;
  const title = useMemo(() => user?.name || "Chat", [user?.name]);

  useEffect(() => {
    joinMatch(matchId);
    getMessages(matchId).then(setMessages).catch(() => setMessages([]));
  }, [joinMatch, matchId]);

  useEffect(() => {
    if (!socket) return undefined;

    const onNewMessage = (message) => {
      if (message.match === matchId || message.match?._id === matchId) {
        setMessages((current) => {
          if (current.some((item) => item._id === message._id)) {
            return current;
          }

          return [...current, message];
        });
      }
    };

    const onTyping = (payload) => {
      if (payload.matchId === matchId && payload.userId !== currentUser?.id) {
        setTypingUserId(payload.isTyping ? payload.userId : null);
      }
    };

    socket.on("message:new", onNewMessage);
    socket.on("typing", onTyping);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing", onTyping);
    };
  }, [currentUser?.id, matchId, socket]);

  const handleSend = async (text) => {
    const createdMessage = await sendMessage(matchId, text);
    setMessages((current) => [...current, createdMessage]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>{title}</Text>
          {typingUserId ? <Text style={styles.typing}>typing...</Text> : null}
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          const senderId = item.sender?._id || item.sender;
          return <ChatBubble message={item} isMine={senderId === currentUser?.id} />;
        }}
      />

      <MessageInput onSend={handleSend} onTyping={(value) => setTyping(matchId, value)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ececf2",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#ff4458",
    fontSize: 34,
    fontWeight: "700",
  },
  title: {
    color: "#171a25",
    fontSize: 20,
    fontWeight: "900",
  },
  typing: {
    color: "#8c8f9f",
    fontSize: 12,
  },
  messages: {
    paddingVertical: 12,
  },
});
