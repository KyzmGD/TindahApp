import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../services/auth.api";
import { setAuthToken } from "../services/api";

const TOKEN_KEY = "tinder_clone_token";
const USER_KEY = "tinder_clone_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!storedToken) {
          setIsBootstrapping(false);
          return;
        }

        setAuthToken(storedToken);
        setToken(storedToken);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const response = await authApi.getMe();
        const freshUser = response.user;
        setUser(freshUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      } catch (error) {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      } finally {
        setIsBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  const persistSession = useCallback(async (nextToken, nextUser) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);

    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      await persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      await persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await authApi.updateMe(payload);
    setUser(data.user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }, []);
  

const refreshUser = useCallback(async () => {
  const response = await authApi.getMe();

  const freshUser = response.user;

  setUser(freshUser);

  await AsyncStorage.setItem(
    USER_KEY,
    JSON.stringify(freshUser)
  );

  return freshUser;
}, []);
  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshUser,
    }),
    [
  isBootstrapping,
  signIn,
  signOut,
  signUp,
  token,
  updateProfile,
  refreshUser,
  user,
],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
