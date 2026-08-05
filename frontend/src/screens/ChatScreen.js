import { useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { leaveGamerRecruitment } from "../services/gamerLobby.api";
import { getMatches, getMessages } from "../services/swipe.api";

function createClientMessageId(matchId) {
  return `local-${matchId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getMessageId(message) {
  return message._id || message.clientMessageId;
}

function getUserId(user) {
  if (!user) {
    return "";
  }

  if (typeof user === "string") {
    return user;
  }

  return user.id || user._id || "";
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

  return currentMessages.map((item, index) => {
    if (index !== existingIndex) return item;
    const merged = { ...item, ...nextMessage };
    if (nextMessage._id && !String(nextMessage._id).startsWith("local-")) {
      delete merged.status;
    }
    return merged;
  });
}

function getAvatar(user) {
  if (user?.avatarUrl) {
    return user.avatarUrl;
  }

  if (!user?.photos?.length) return null;

  const primary = user.photos.find((photo) => photo.isPrimary);
  return primary?.url || user.photos[0]?.url;
}

function getOtherUser(match, currentUserId) {
  return match?.users?.find((item) => item._id !== currentUserId && item.id !== currentUserId) || null;
}

function isMessageReadBy(message, userId) {
  return Array.isArray(message.readBy)
    && message.readBy.some((reader) => getUserId(reader) === userId);
}

function mergeReadState(messages, { userId, messageIds }) {
  if (!userId || !messageIds?.length) {
    return messages;
  }

  const readIds = new Set(messageIds);

  return messages.map((message) => {
    const messageId = getMessageId(message);

    if (!readIds.has(messageId) || isMessageReadBy(message, userId)) {
      return message;
    }

    return {
      ...message,
      readBy: [...(message.readBy || []), userId],
    };
  });
}

function formatLastActive(lastActive) {
  if (!lastActive) {
    return "offline";
  }

  const date = new Date(lastActive);

  if (Number.isNaN(date.getTime())) {
    return "offline";
  }

  return `last active ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function ProfileAvatar({ user, style }) {
  const avatarUrl = getAvatar(user);
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={style} />;
  }

  return (
    <View style={[style, styles.avatarFallback]}>
      <Text style={styles.avatarFallbackText}>{initial}</Text>
    </View>
  );
}

function formatConversationDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Today";
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return `${isToday ? "Today" : date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function ChatScreen({ navigation, route, embedded = false, onTeamLeft, readReceiptsEnabled = true }) {
  const { user: currentUser } = useAuth();
  const isFocused = useIsFocused();
  const {
    socket,
    isConnected,
    joinMatch,
    markMessagesRead,
    sendMessageRealtime,
    setTyping,
  } = useSocket();
  const { match: initialMatch, user: initialRecipient, matchId: notificationMatchId } = route.params || {};
  const [resolvedMatch, setResolvedMatch] = useState(initialMatch || null);
  const [resolvedRecipient, setResolvedRecipient] = useState(initialRecipient || null);
  const [recipientPresence, setRecipientPresence] = useState({
    isOnline: Boolean(initialRecipient?.isOnline),
    lastActive: initialRecipient?.lastActive || null,
  });
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingCount, setSendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [inviteSent, setInviteSent] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const matchId = resolvedMatch?._id || notificationMatchId;
  const recipientId = getUserId(resolvedRecipient);
  const isTeamChat = resolvedMatch?.source === "gamer_lobby" && Boolean(resolvedMatch?.gamerContext?.recruitment);
  const teamMembers = useMemo(() => resolvedMatch?.users || [], [resolvedMatch?.users]);
  const title = useMemo(
    () => (isTeamChat ? resolvedMatch?.gamerContext?.teamName : resolvedRecipient?.name) || "Chat",
    [isTeamChat, resolvedMatch?.gamerContext?.teamName, resolvedRecipient?.name],
  );
  const statusText = useMemo(() => {
    if (typingUserId) {
      return "typing...";
    }

    if (recipientPresence.isOnline) {
      return "online";
    }

    return formatLastActive(recipientPresence.lastActive);
  }, [recipientPresence.isOnline, recipientPresence.lastActive, typingUserId]);
  const lobbyStatusText = useMemo(() => {
    if (isTeamChat) {
      return (resolvedMatch?.gamerContext?.gameName || "Game").toUpperCase();
    }

    return recipientPresence.isOnline ? "ONLINE" : "OFFLINE";
  }, [isTeamChat, recipientPresence.isOnline, resolvedMatch?.gamerContext?.gameName]);
  const isHeaderOnline = recipientPresence.isOnline;
  const inputDisabled = !matchId || loading || historyFailed;
  // Load history only when opening/retrying a conversation. Presence and team-member
  // updates replace resolvedMatch frequently and must not restart this request.
  useEffect(() => {
    let isMounted = true;

    const loadChat = async () => {
      setLoading(true);
      setError("");
      setHistoryFailed(false);

      try {
        let activeMatch = resolvedMatch;
        let activeRecipient = resolvedRecipient;

        if ((!activeMatch || !activeRecipient) && notificationMatchId) {
          const matches = await getMatches();
          activeMatch = matches.find((item) => item._id === notificationMatchId);

          if (activeMatch) {
            activeRecipient = getOtherUser(activeMatch, currentUser?.id);
          }
        }

        const activeIsTeamChat = activeMatch?.source === "gamer_lobby" && Boolean(activeMatch?.gamerContext?.recruitment);
        if (activeIsTeamChat && !activeRecipient) {
          activeRecipient = activeMatch.users?.find((member) => getUserId(member) === currentUser?.id)
            || activeMatch.users?.[0]
            || currentUser;
        }

        if (!activeMatch || (!activeRecipient && !activeIsTeamChat)) {
          navigation.goBack();
          return;
        }

        if (isMounted) {
          setResolvedMatch(activeMatch);
          setResolvedRecipient(activeRecipient);
          setRecipientPresence({
            isOnline: Boolean(activeRecipient.isOnline),
            lastActive: activeRecipient.lastActive || null,
          });
        }

        const fetchedMessages = await getMessages(activeMatch._id);
        if (isMounted) {
          setMessages(fetchedMessages);
        }
      } catch (loadError) {
        if (isMounted) {
          setMessages([]);
          setHistoryFailed(true);
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
  }, [
    currentUser?.id,
    navigation,
    notificationMatchId,
    retryKey,
  ]);

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
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        setTypingUserId(payload.isTyping ? payload.userId : null);

        if (payload.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUserId(null);
          }, 2500);
        }
      }
    };

    const onPresenceSnapshot = (payload) => {
      if (payload.matchId !== matchId) {
        return;
      }

      setResolvedMatch((current) => current ? {
        ...current,
        users: (current.users || []).map((member) => {
          const presence = payload.users?.find((item) => item.userId === getUserId(member));
          return presence ? { ...member, isOnline: Boolean(presence.isOnline), lastActive: presence.lastActive || null } : member;
        }),
      } : current);

      const presence = payload.users?.find((item) => item.userId === recipientId);

      if (presence) {
        setRecipientPresence({
          isOnline: Boolean(presence.isOnline),
          lastActive: presence.lastActive || null,
        });
      }
    };

    const onPresenceUpdate = (payload) => {
      setResolvedMatch((current) => current ? {
        ...current,
        users: (current.users || []).map((member) => (
          getUserId(member) === payload.userId
            ? { ...member, isOnline: Boolean(payload.isOnline), lastActive: payload.lastActive || null }
            : member
        )),
      } : current);

      if (payload.userId !== recipientId) {
        return;
      }

      setRecipientPresence({
        isOnline: Boolean(payload.isOnline),
        lastActive: payload.lastActive || null,
      });
    };

    const onReadMessage = (payload) => {
      if (payload.matchId !== matchId) {
        return;
      }

      setMessages((current) => mergeReadState(current, payload));
    };

    const onTeamMembership = (payload) => {
      if (payload.matchId !== matchId || !payload.match) return;
      setResolvedMatch(payload.match);
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("typing", onTyping);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("read_message", onReadMessage);
    socket.on("team:membership", onTeamMembership);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("typing", onTyping);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("read_message", onReadMessage);
      socket.off("team:membership", onTeamMembership);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser?.id, matchId, recipientId, socket]);

  useEffect(() => {
    if (!isFocused || !readReceiptsEnabled || !matchId || !currentUser?.id || !messages.length) {
      return;
    }

    const unreadReceivedMessageIds = messages
      .filter((message) => {
        const senderId = getUserId(message.sender);
        const messageId = message._id;

        return (
          messageId
          && senderId
          && senderId !== currentUser.id
          && !isMessageReadBy(message, currentUser.id)
        );
      })
      .map((message) => message._id);

    if (unreadReceivedMessageIds.length) {
      markMessagesRead(matchId, unreadReceivedMessageIds);
    }
  }, [currentUser?.id, isFocused, markMessagesRead, matchId, messages, readReceiptsEnabled]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages.length]);

  const handleSend = async (text = "", imageUrl = "") => {
    if ((!text.trim() && !imageUrl) || !matchId || inputDisabled) return false;
    const clientMessageId = createClientMessageId(matchId);
    const pendingMessage = {
      _id: clientMessageId,
      clientMessageId,
      match: matchId,
      matchId,
      sender: currentUser?.id,
      text,
      imageUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setError("");
    setSendingCount((current) => current + 1);
    setMessages((current) => mergeMessage(current, pendingMessage));

    try {
      const result = await sendMessageRealtime({ matchId, text, imageUrl, clientMessageId });

      if (result?.status !== "pending") {
        setMessages((current) => mergeMessage(current, result));
      }
      return true;
    } catch (sendError) {
      setMessages((current) => mergeMessage(current, { ...pendingMessage, status: "failed" }));
      setError(sendError.message || "Unable to send message.");
      return false;
    } finally {
      setSendingCount((current) => Math.max(current - 1, 0));
    }
  };
  const handleInvite = async () => {
    if (inviteSent || sendingCount > 0) return;

    if (isTeamChat) {
      const inviteText = `Join my ${title} team on Tindah.`;
      try {
        if (Platform.OS === "web" && globalThis.navigator?.clipboard?.writeText) {
          await globalThis.navigator.clipboard.writeText(inviteText);
        } else {
          Alert.alert("Team invite", inviteText);
        }
        setInviteSent(true);
      } catch {
        Alert.alert("Team invite", inviteText);
      }
      return;
    }

    const sent = await handleSend("Want to team up?");
    if (sent) setInviteSent(true);
  };
  const handleLeaveTeam = async () => {
    const recruitmentId = resolvedMatch?.gamerContext?.recruitment?._id
      || resolvedMatch?.gamerContext?.recruitment;
    if (!recruitmentId || leavingTeam) return;

    setLeavingTeam(true);
    setError("");
    try {
      await leaveGamerRecruitment(recruitmentId);
      setShowLeaveConfirm(false);
      onTeamLeft?.(matchId);
      if (!embedded) navigation.goBack();
    } catch (leaveError) {
      setError(leaveError.message || "Unable to leave this team.");
    } finally {
      setLeavingTeam(false);
    }
  };
  const handleRetry = async (message) => {
    if (!message?.clientMessageId || sendingCount > 0 || inputDisabled) return;
    const retryingMessage = { ...message, status: "pending" };
    setError("");
    setSendingCount((current) => current + 1);
    setMessages((current) => mergeMessage(current, retryingMessage));
    try {
      const result = await sendMessageRealtime({
        matchId,
        text: message.text || "",
        imageUrl: message.imageUrl || "",
        clientMessageId: message.clientMessageId,
      });
      setMessages((current) => mergeMessage(current, result));
    } catch (retryError) {
      setMessages((current) => mergeMessage(current, { ...message, status: "failed" }));
      setError(retryError.message || "Unable to resend message.");
    } finally {
      setSendingCount((current) => Math.max(current - 1, 0));
    }
  };
  const headerUser = isTeamChat ? (teamMembers[0] || currentUser) : resolvedRecipient;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, embedded && styles.embeddedScreen]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={[styles.header, embedded && styles.embeddedHeader]}>
        {!embedded ? <Pressable
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
        </Pressable> : null}
        <View style={[styles.headerCenter, embedded && styles.embeddedHeaderCenter]}>
          <View style={styles.avatarWrap}>
            <ProfileAvatar user={headerUser} style={styles.avatar} />
            {!isTeamChat ? (
              <View
                style={[
                  styles.onlineDot,
                  isHeaderOnline ? styles.onlineDotActive : styles.onlineDotInactive,
                ]}
              />
            ) : null}
          </View>
          <View style={embedded && styles.embeddedIdentity}>
            <Text style={[styles.title, embedded && styles.embeddedTitle]}>{title}</Text>
            <Text style={[styles.statusText, !isTeamChat && isHeaderOnline && styles.statusOnline, embedded && styles.embeddedStatus]}>
              {isTeamChat ? lobbyStatusText : embedded && !typingUserId ? lobbyStatusText : statusText}
            </Text>
          </View>
        </View>
        {embedded ? (
          <View style={styles.embeddedActions}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: inviteSent || sendingCount > 0 }} disabled={inviteSent || sendingCount > 0} onPress={handleInvite} style={({ hovered, pressed }) => [styles.headerPrimaryButton, (inviteSent || sendingCount > 0) && styles.headerButtonDisabled, hovered && styles.headerButtonHover, pressed && styles.backButtonPressed]}><Text style={styles.headerPrimaryText}>{inviteSent ? "✓ Invited" : "▣ Invite"}</Text></Pressable>
            {isTeamChat ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Leave ${title}`} onPress={() => setShowLeaveConfirm(true)} style={({ hovered, pressed }) => [styles.headerDangerButton, hovered && styles.headerButtonHover, pressed && styles.backButtonPressed]}><Text style={styles.headerDangerText}>Leave</Text></Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${title}'s profile`} onPress={() => setShowProfile(true)} style={({ hovered, pressed }) => [styles.headerSecondaryButton, hovered && styles.headerButtonHover, pressed && styles.backButtonPressed]}><Text style={styles.headerSecondaryText}>View Profile</Text></Pressable>
            )}
          </View>
        ) : isTeamChat ? (
          <View style={styles.mobileTeamActions}>
            <Pressable accessibilityRole="button" disabled={inviteSent} onPress={handleInvite} style={styles.headerPrimaryButton}><Text style={styles.headerPrimaryText}>{inviteSent ? "✓ Invited" : "▣ Invite"}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setShowLeaveConfirm(true)} style={styles.headerDangerButton}><Text style={styles.headerDangerText}>Leave</Text></Pressable>
          </View>
        ) : (
          <Pressable style={styles.menuButton}><Text style={styles.menuText}>•••</Text></Pressable>
        )}
      </View>
      {embedded && isTeamChat ? (
        <View style={styles.teamMembersArea}>
          <Text style={styles.teamMembersLabel}>TEAM MEMBERS</Text>
          <View style={styles.teamMembersRow}>
            {teamMembers.map((member) => (
              <View key={getUserId(member)} style={styles.teamMember}>
                <View style={styles.teamMemberAvatarWrap}>
                  <ProfileAvatar user={member} style={styles.teamMemberAvatar} />
                  <View style={[styles.teamMemberPresence, member.isOnline ? styles.onlineDotActive : styles.onlineDotInactive]} />
                </View>
                <Text numberOfLines={1} style={styles.teamMemberName}>{getUserId(member) === currentUser?.id ? `${member.name || "You"} (You)` : member.name || "Player"}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#ff4f7b" size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => getMessageId(item)}
          style={embedded && styles.embeddedMessagesList}
          contentContainerStyle={[
            styles.messages,
            embedded && styles.embeddedMessages,
            !messages.length && styles.emptyMessages,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatText}>Say hello and start the conversation.</Text>
            </View>
          }
          ListHeaderComponent={!embedded && messages.length ? <Text style={styles.dateDivider}>{formatConversationDate(messages[0]?.createdAt)}</Text> : null}
          renderItem={({ item }) => {
            const senderId = item.sender?._id || item.sender;
            const isMine = senderId === currentUser?.id;
            const sender = senderId === currentUser?.id
              ? currentUser
              : teamMembers.find((member) => getUserId(member) === senderId) || resolvedRecipient;
            const teamRecipientIds = (item.receivers?.length ? item.receivers : teamMembers)
              .map(getUserId)
              .filter((userId) => userId && userId !== currentUser?.id);
            const isRead = isMine && (isTeamChat
              ? teamRecipientIds.length > 0 && teamRecipientIds.every((userId) => isMessageReadBy(item, userId))
              : Boolean(recipientId && isMessageReadBy(item, recipientId)));
            return (
              <ChatBubble
                message={item}
                isMine={isMine}
                avatarUrl={getAvatar(sender)}
                avatarName={sender?.name}
                isRead={isRead}
                onRetry={handleRetry}
              />
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {error ? <View style={styles.errorRow}><Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>{historyFailed ? <Pressable accessibilityRole="button" onPress={() => setRetryKey((current) => current + 1)} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></Pressable> : null}</View> : null}
      {sendingCount > 0 && !error ? (
        <Text style={styles.sendingHint}>Sending...</Text>
      ) : null}

      <MessageInput
        disabled={inputDisabled}
        onError={setError}
        onSend={handleSend}
        onSendImage={(imageUrl) => handleSend("", imageUrl)}
        onTyping={(value) => setTyping(matchId, value)}
      />
      <Modal visible={showProfile} transparent animationType="fade" onRequestClose={() => setShowProfile(false)}>
        <Pressable style={styles.profileOverlay} onPress={() => setShowProfile(false)}>
          <Pressable style={styles.profilePreview} onPress={(event) => event.stopPropagation()}>
            <ProfileAvatar user={resolvedRecipient} style={styles.profilePreviewAvatar} />
            <Text style={styles.profilePreviewName}>{resolvedRecipient?.name || "Player"}</Text>
            <Text style={styles.profilePreviewStatus}>{recipientPresence.isOnline ? "Online now" : statusText}</Text>
            {resolvedRecipient?.jobTitle ? <Text style={styles.profilePreviewMeta}>{resolvedRecipient.jobTitle}</Text> : null}
            {resolvedRecipient?.school ? <Text style={styles.profilePreviewMeta}>{resolvedRecipient.school}</Text> : null}
            {resolvedRecipient?.bio ? <Text style={styles.profilePreviewBio}>{resolvedRecipient.bio}</Text> : null}
            <View style={styles.profilePreviewInterests}>{(resolvedRecipient?.interests || []).map((interest) => <View key={interest} style={styles.profilePreviewChip}><Text style={styles.profilePreviewChipText}>#{interest}</Text></View>)}</View>
            <Pressable onPress={() => setShowProfile(false)} style={styles.profileCloseButton}><Text style={styles.profileCloseText}>Close</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showLeaveConfirm} transparent animationType="fade" onRequestClose={() => setShowLeaveConfirm(false)}>
        <Pressable style={styles.profileOverlay} onPress={() => !leavingTeam && setShowLeaveConfirm(false)}>
          <Pressable style={styles.leaveDialog} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.leaveDialogTitle}>Leave {title}?</Text>
            <Text style={styles.leaveDialogText}>You will lose access to this team chat. You can join the team again later if a slot is available.</Text>
            <View style={styles.leaveDialogActions}>
              <Pressable disabled={leavingTeam} onPress={() => setShowLeaveConfirm(false)} style={styles.leaveCancelButton}><Text style={styles.leaveCancelText}>Cancel</Text></Pressable>
              <Pressable disabled={leavingTeam} onPress={handleLeaveTeam} style={[styles.leaveConfirmButton, leavingTeam && styles.headerButtonDisabled]}><Text style={styles.leaveConfirmText}>{leavingTeam ? "Leaving..." : "Leave team"}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050506",
  },
  embeddedScreen: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#111a2f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.035)",
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
  embeddedHeader: {
    minHeight: 90,
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 18,
    backgroundColor: "#121b30",
    borderBottomColor: "rgba(255,255,255,0.06)",
    position: "relative",
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
  embeddedHeaderCenter: {
    position: "relative",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 13,
  },
  embeddedIdentity: {
    alignItems: "flex-start",
    gap: 3,
  },
  embeddedTitle: {
    color: "#dce5ff",
    fontSize: 23,
    lineHeight: 26,
    marginTop: 0,
  },
  embeddedStatus: { color: "#ff8ba0" },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#ff7aa2",
    backgroundColor: "#ff4f7b",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  avatarWrap: {
    width: 58,
    height: 58,
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#111112",
  },
  onlineDotActive: {
    backgroundColor: "#20e49b",
  },
  onlineDotInactive: {
    backgroundColor: "#5f5663",
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
  statusOnline: {
    color: "#20e49b",
  },
  menuButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  embeddedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  mobileTeamActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerSecondaryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d2840",
    borderWidth: 1,
    borderColor: "#35415b",
  },
  headerPrimaryButton: {
    minHeight: 38,
    paddingHorizontal: 17,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d84382",
  },
  headerDangerButton: {
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,82,107,0.12)",
    borderWidth: 1,
    borderColor: "#ff526b",
  },
  headerButtonHover: { transform: [{ translateY: -1 }], opacity: 0.9 },
  headerButtonDisabled: { opacity: 0.56 },
  headerSecondaryText: { color: "#d5def7", fontSize: 10, fontWeight: "800" },
  headerPrimaryText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  headerDangerText: { color: "#ff91a3", fontSize: 10, fontWeight: "900" },
  teamMembersArea: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 11,
    backgroundColor: "#121b30",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  teamMembersLabel: { color: "#7885a3", fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginBottom: 7 },
  teamMembersRow: { flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" },
  teamMember: { maxWidth: 158, flexDirection: "row", alignItems: "center", gap: 7 },
  teamMemberAvatarWrap: { width: 40, height: 40 },
  teamMemberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#283653", borderWidth: 1, borderColor: "#596987" },
  teamMemberPresence: { position: "absolute", right: -1, bottom: -1, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: "#121b30" },
  teamMemberName: { color: "#cbd5ee", fontSize: 10, fontWeight: "700", maxWidth: 120 },
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
  embeddedMessagesList: {
    backgroundColor: "#10192d",
  },
  embeddedMessages: {
    paddingTop: 26,
    paddingHorizontal: 18,
    paddingBottom: 22,
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
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  retryButton: { minHeight: 30, paddingHorizontal: 12, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  retryButtonText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  dateDivider: { color: "#7885a3", fontSize: 9, textAlign: "center", marginBottom: 14 },
  profileOverlay: { flex: 1, backgroundColor: "rgba(4,8,17,0.78)", alignItems: "center", justifyContent: "center", padding: 24 },
  profilePreview: { width: "100%", maxWidth: 380, alignItems: "center", padding: 26, borderRadius: 18, backgroundColor: "#121c31", borderWidth: 1, borderColor: "#3b4968", shadowColor: "#8f6cda", shadowOpacity: 0.3, shadowRadius: 24 },
  profilePreviewAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "#a37cea" },
  profilePreviewName: { color: "#dce5ff", fontSize: 23, fontWeight: "900", marginTop: 14 },
  profilePreviewStatus: { color: "#ff718c", fontSize: 11, fontWeight: "800", marginTop: 3 },
  profilePreviewMeta: { color: "#9da9c7", fontSize: 12, marginTop: 7 },
  profilePreviewBio: { color: "#bcc7e1", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 14 },
  profilePreviewInterests: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 15 },
  profilePreviewChip: { backgroundColor: "rgba(132,99,207,0.2)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  profilePreviewChipText: { color: "#c1a6f4", fontSize: 9, fontWeight: "700" },
  profileCloseButton: { marginTop: 20, minHeight: 40, paddingHorizontal: 28, borderRadius: 20, backgroundColor: "#ff526b", alignItems: "center", justifyContent: "center" },
  profileCloseText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  leaveDialog: { width: "100%", maxWidth: 390, padding: 26, borderRadius: 20, backgroundColor: "#121c31", borderWidth: 1, borderColor: "#3b4968" },
  leaveDialogTitle: { color: "#f4f6ff", fontSize: 22, fontWeight: "900" },
  leaveDialogText: { color: "#aab5cf", fontSize: 13, lineHeight: 20, marginTop: 10 },
  leaveDialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  leaveCancelButton: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#1d2840" },
  leaveCancelText: { color: "#d5def7", fontSize: 11, fontWeight: "800" },
  leaveConfirmButton: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#ff526b" },
  leaveConfirmText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
});
