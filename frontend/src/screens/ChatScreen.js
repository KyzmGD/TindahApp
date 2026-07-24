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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ hovered, pressed }) => [
            styles.backButton,
            hovered && styles.backButtonHover,
            pressed && styles.backButtonPressed,
          ]}
        >
          {({ hovered }) => (
            <Text style={[styles.backText, hovered && styles.backTextHover]}>
              {"‹"}
            </Text>
          )}
        </Pressable>
        <View style={styles.headerCenter}>
          <Image source={{ uri: getAvatar(recipient) }} style={styles.avatar} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.statusText}>
            {typingUserId ? "typing..." : isConnected ? "online" : "reconnecting..."}
          </Text>
        </View>
        <Pressable style={styles.menuButton}>
          <Text style={styles.menuText}>...</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#ff4f7b" size="large" />
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
            return (
              <ChatBubble
                message={item}
                isMine={senderId === currentUser?.id}
                avatarUrl={senderId === currentUser?.id ? getAvatar(currentUser) : getAvatar(recipient)}
              />
            );
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
    backgroundColor: "#050506",
  },
  header: {
    minHeight: 132,
    paddingTop: 34,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2c2334",
    backgroundColor: "#111112",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonHover: {
    transform: [{ scale: 1.08 }],
  },
  backButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.92 }],
  },
  backText: {
    color: "#c8c0c7",
    fontSize: 46,
    fontWeight: "300",
    lineHeight: 46,
    marginTop: -3,
  },
  backTextHover: {
    color: "#7cf4c8",
    fontSize: 54,
  },
  headerCenter: {
    position: "absolute",
    left: 90,
    right: 90,
    top: 28,
    alignItems: "center",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#ff7aa2",
    backgroundColor: "#ff4f7b",
  },
  title: {
    color: "#c8c0c7",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 19,
  },
  statusText: {
    color: "#8e858d",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
  menuButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    color: "#c8c0c7",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 2,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: {
    paddingTop: 16,
    paddingBottom: 14,
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
    color: "#cbbdd2",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: "#ff4f7b",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sendingHint: {
    color: "#cbbdd2",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    paddingBottom: 6,
  },
});
