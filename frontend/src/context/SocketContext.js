import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }

    const nextSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [token]);

  const joinMatch = useCallback(
    (matchId) =>
      new Promise((resolve) => {
        if (!socket || !matchId) {
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

  const value = useMemo(
    () => ({
      socket,
      isConnected: Boolean(socket?.connected),
      joinMatch,
      setTyping,
    }),
    [joinMatch, setTyping, socket],
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
