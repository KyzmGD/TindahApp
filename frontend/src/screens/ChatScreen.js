import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ChatBubble from "../components/chat/ChatBubble";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getMessages } from "../services/swipe.api";

function createClientMessageId(matchId) {
  return `local-${matchId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getMessageId(message) {
  return message._id || message.clientMessageId;
}

function isMessageInMatch(message, matchId) {
  return message.match === matchId || message.match?._id === matchId || message.matchId === matchId;
}

function mergeMessage(currentMessages, nextMessage) {
  const clientMessageId = nextMessage.clientMessageId;
  const existingIndex = currentMessages.findIndex(
    (item) => getMessageId(item) === getMessageId(nextMessage)
      || (clientMessageId && item.clientMessageId === clientMessageId),
  );

  if (existingIndex === -1) {
    return [...currentMessages, nextMessage];
  }

  return currentMessages.map((item, index) => (
    index === existingIndex ? { ...item, ...nextMessage } : item
  ));
}

function getAvatar(user) {
  if (!user?.photos?.length) {
    return "https://i.pravatar.cc/300";
  }

  const primary = user.photos.find((photo) => photo.isPrimary);
  return primary?.url || user.photos[0]?.url;
}

export default function ChatScreen({ navigation, route }) {
  const { user: currentUser } = useAuth();
  const { socket, isConnected, joinMatch, sendMessageRealtime, setTyping } = useSocket();
  const { match, user: recipient } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingCount, setSendingCount] = useState(0);
  const listRef = useRef(null);

  const matchId = match?._id;
  const title = useMemo(() => recipient?.name || "Chat", [recipient?.name]);
  const inputDisabled = !matchId || loading;

  useEffect(() => {
    if (!match || !recipient) {
      navigation.goBack();
      return undefined;
    }

    let isMounted = true;

    const loadChat = async () => {
      setLoading(true);
      setError("");

      try {
        await joinMatch(matchId);
        const fetchedMessages = await getMessages(matchId);
        if (isMounted) {
          setMessages(fetchedMessages);
        }
      } catch (loadError) {
        if (isMounted) {
          setMessages([]);
          setError(loadError.message || "Unable to load messages.");
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

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages.length]);

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

    setError("");
    setSendingCount((current) => current + 1);
    setMessages((current) => mergeMessage(current, pendingMessage));

    try {
      const result = await sendMessageRealtime({ matchId, text, clientMessageId });

      if (result?.status !== "pending") {
        setMessages((current) => mergeMessage(current, result));
      }
    } catch (sendError) {
      setMessages((current) => mergeMessage(current, { ...pendingMessage, status: "failed" }));
      setError(sendError.message || "Unable to send message.");
    } finally {
      setSendingCount((current) => Math.max(current - 1, 0));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <Image source={{ uri: getAvatar(recipient) }} style={styles.avatar} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.statusText}>
            {typingUserId ? "typing..." : isConnected ? "online" : "reconnecting..."}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#ff4458" size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => getMessageId(item)}
          contentContainerStyle={[
            styles.messages,
            !messages.length && styles.emptyMessages,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatText}>Say hello and start the conversation.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const senderId = item.sender?._id || item.sender;
            return <ChatBubble message={item} isMine={senderId === currentUser?.id} />;
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {sendingCount > 0 && !error ? (
        <Text style={styles.sendingHint}>Sending...</Text>
      ) : null}

      <MessageInput
        disabled={inputDisabled}
        onSend={handleSend}
        onTyping={(value) => setTyping(matchId, value)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#272020",
    backgroundColor: "#101010",
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1d1a1a",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  statusText: {
    color: "#bfb8b8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: {
    paddingVertical: 12,
  },
  emptyMessages: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChat: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyChatTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  emptyChatText: {
    color: "#bfb8b8",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: "#ff4458",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sendingHint: {
    color: "#bfb8b8",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingBottom: 6,
  },
});
