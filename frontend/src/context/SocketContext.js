import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);
const MESSAGE_ACK_TIMEOUT_MS = 8000;

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const pendingMessagesRef = useRef(new Map());

  const emitMessage = useCallback((activeSocket, pendingMessage) =>
    new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Message acknowledgement timeout"));
        }
      }, MESSAGE_ACK_TIMEOUT_MS);

      activeSocket.emit(
        "send_message",
        {
          matchId: pendingMessage.matchId,
          text: pendingMessage.text,
          imageUrl: pendingMessage.imageUrl,
          clientMessageId: pendingMessage.clientMessageId,
        },
        (response) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeout);

          if (response?.ok) {
            pendingMessagesRef.current.delete(pendingMessage.clientMessageId);
            resolve(response.message);
            return;
          }

          reject(new Error(response?.message || "Could not send message"));
        },
      );
    }), []);

  const flushPendingMessages = useCallback((activeSocket) => {
    if (!activeSocket?.connected) {
      return;
    }

    pendingMessagesRef.current.forEach((pendingMessage) => {
      emitMessage(activeSocket, pendingMessage).catch(() => {
        pendingMessagesRef.current.set(pendingMessage.clientMessageId, {
          ...pendingMessage,
          status: "pending",
        });
      });
    });
  }, [emitMessage]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      pendingMessagesRef.current.clear();
      return undefined;
    }

    const nextSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });

    const handleConnect = () => {
      setIsConnected(true);
      flushPendingMessages(nextSocket);
    };
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.io.on("reconnect", handleConnect);
    setSocket(nextSocket);

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.io.off("reconnect", handleConnect);
      nextSocket.disconnect();
    };
  }, [flushPendingMessages, token]);

  const joinMatch = useCallback(
    (matchId) =>
      new Promise((resolve) => {
        if (!socket?.connected || !matchId) {
          resolve({ ok: false });
          return;
        }

        socket.emit("match:join", matchId, resolve);
      }),
    [socket],
  );

  const setTyping = useCallback(
    (matchId, isTyping) => {
      socket?.emit("typing", { matchId, isTyping });
    },
    [socket],
  );

  const sendMessageRealtime = useCallback(
    ({ matchId, text, imageUrl, clientMessageId }) => {
      const pendingMessage = {
        _id: clientMessageId,
        clientMessageId,
        match: matchId,
        matchId,
        text,
        imageUrl,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      if (!matchId || !clientMessageId) {
        return Promise.reject(new Error("matchId and clientMessageId are required"));
      }

      pendingMessagesRef.current.set(clientMessageId, pendingMessage);

      if (!socket?.connected) {
        return Promise.resolve(pendingMessage);
      }

      return emitMessage(socket, pendingMessage)
        .then((message) => message)
        .catch(() => pendingMessage);
    },
    [emitMessage, socket],
  );

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      joinMatch,
      setTyping,
      sendMessageRealtime,
      flushPendingMessages: () => flushPendingMessages(socket),
    }),
    [flushPendingMessages, isConnected, joinMatch, sendMessageRealtime, setTyping, socket],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const value = useContext(SocketContext);

  if (!value) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return value;
}
