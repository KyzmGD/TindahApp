import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import ChatBubble from "../components/chat/ChatBubble";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getMessages } from "../services/swipe.api";

function createClientMessageId(matchId) {
  return `local-${matchId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isMessageInMatch(message, matchId) {
  return message.match === matchId || message.match?._id === matchId || message.matchId === matchId;
}

function mergeMessage(currentMessages, nextMessage) {
  const clientMessageId = nextMessage.clientMessageId;
  const existingIndex = currentMessages.findIndex(
    (item) => item._id === nextMessage._id
      || (clientMessageId && item.clientMessageId === clientMessageId),
  );

  if (existingIndex === -1) {
    return [...currentMessages, nextMessage];
  }

  return currentMessages.map((item, index) => (
    index === existingIndex ? { ...item, ...nextMessage, status: nextMessage.status } : item
  ));
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
export default function ChatScreen({ navigation, route }) {
  const { user: currentUser } = useAuth();
  const { socket, isConnected, joinMatch, sendMessageRealtime, setTyping } = useSocket();
  const { match, user: recipient } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const matchId = match?._id;
  const title = useMemo(() => recipient?.name || "Chat", [recipient?.name]);

  useEffect(() => {
    if (!match || !recipient) {
      navigation.goBack();
      return undefined;
    }

    let isMounted = true;

    const loadChat = async () => {
      setLoading(true);

      try {
        await joinMatch(matchId);
        const fetchedMessages = await getMessages(matchId);
        if (isMounted) {
          setMessages(fetchedMessages);
        }
      } catch {
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      isMounted = false;
    };
  }, [joinMatch, match, matchId, navigation, recipient]);

  useEffect(() => {
    if (isConnected && matchId) {
      joinMatch(matchId);
    }
  }, [isConnected, joinMatch, matchId]);

  useEffect(() => {
    if (!socket) return undefined;

    const onReceiveMessage = (message) => {
      if (isMessageInMatch(message, matchId)) {
        setMessages((current) => mergeMessage(current, message));
      }
    };

    const onTyping = (payload) => {
      if (payload.matchId === matchId && payload.userId !== currentUser?.id) {
        setTypingUserId(payload.isTyping ? payload.userId : null);
      }
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("typing", onTyping);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("typing", onTyping);
    };
  }, [currentUser?.id, matchId, socket]);

  const handleSend = async (text) => {
    const clientMessageId = createClientMessageId(matchId);
    const pendingMessage = {
      _id: clientMessageId,
      clientMessageId,
      match: matchId,
      matchId,
      sender: currentUser?.id,
      text,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => mergeMessage(current, pendingMessage));

    try {
      const result = await sendMessageRealtime({ matchId, text, clientMessageId });

      if (result?.status !== "pending") {
        setMessages((current) => mergeMessage(current, result));
      }
    } catch {
      setMessages((current) => mergeMessage(current, { ...pendingMessage, status: "pending" }));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <>
  <Image
    source={{
      uri: getAvatar(recipient),
    }}
    style={styles.avatar}
  />

  <View>
    <Text style={styles.title}>{title}</Text>
    {typingUserId ? (
      <Text style={styles.typing}>
        typing...
      </Text>
    ) : null}
  </View>
</>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#ff4458" size="large" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messages}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const senderId = item.sender?._id || item.sender;
            return <ChatBubble message={item} isMine={senderId === currentUser?.id} />;
          }}
        />
      )}

      <MessageInput onSend={handleSend} onTyping={(value) => setTyping(matchId, value)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  avatar: {
  width: 48,
  height: 48,
  borderRadius: 24,
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
