import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import api from "./api";

const DEVICE_ID_KEY = "tindah_push_device_id";
const LAST_TOKEN_KEY = "tindah_push_last_token";
const PLACEHOLDER_PROJECT_ID = "REPLACE_WITH_EAS_PROJECT_ID";

const PLATFORM_MAP = {
  android: "android",
  ios: "ios",
  web: "web",
};

export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== "android") {
    return;
  }

  const importance = Notifications.AndroidImportance?.HIGH;

  await Promise.all([
    Notifications.setNotificationChannelAsync("matches", {
      name: "Matches",
      importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ff4f7b",
      sound: "default",
    }),
    Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#20c7ff",
      sound: "default",
    }),
  ]);
}

export function configurePushNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  setupAndroidNotificationChannels().catch((error) => {
    console.warn("Android notification channel setup skipped:", error.message);
  });
}

function getExpoProjectId() {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.manifest2?.extra?.eas?.projectId ||
    null
  );
}

function isUsableProjectId(projectId) {
  return Boolean(projectId && projectId !== PLACEHOLDER_PROJECT_ID);
}

function getPlatform() {
  return PLATFORM_MAP[Platform.OS] || "unknown";
}

async function getDeviceId() {
  const existingDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const generatedDeviceId = `tindah-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generatedDeviceId);
  return generatedDeviceId;
}

async function getNotificationPermissionStatus() {
  const provisionalStatus = Notifications.IosAuthorizationStatus?.PROVISIONAL;
  const currentPermission = await Notifications.getPermissionsAsync();

  if (
    currentPermission.granted ||
    currentPermission.ios?.status === provisionalStatus
  ) {
    return "granted";
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();

  if (
    requestedPermission.granted ||
    requestedPermission.ios?.status === provisionalStatus
  ) {
    return "granted";
  }

  return "denied";
}

export async function registerExpoPushToken() {
  if (Platform.OS === "web") {
    return { registered: false, reason: "web-push-not-supported" };
  }

  await setupAndroidNotificationChannels();

  const projectId = getExpoProjectId();

  if (!isUsableProjectId(projectId)) {
    return { registered: false, reason: "missing-expo-project-id" };
  }

  const permissionStatus = await getNotificationPermissionStatus();

  if (permissionStatus !== "granted") {
    return { registered: false, reason: "permission-denied" };
  }

  const [{ data: token }, deviceId] = await Promise.all([
    Notifications.getExpoPushTokenAsync({ projectId }),
    getDeviceId(),
  ]);

  await api.post("/v1/users/push-token", {
    token,
    provider: "expo",
    platform: getPlatform(),
    deviceId,
  });

  await AsyncStorage.setItem(LAST_TOKEN_KEY, token);

  return { registered: true, token };
}

export async function registerExpoPushTokenSafely() {
  try {
    return await registerExpoPushToken();
  } catch (error) {
    console.warn("Push token registration skipped:", error.message);
    return { registered: false, reason: "registration-failed" };
  }
}

export async function revokeStoredExpoPushToken() {
  const [token, deviceId] = await Promise.all([
    AsyncStorage.getItem(LAST_TOKEN_KEY),
    AsyncStorage.getItem(DEVICE_ID_KEY),
  ]);

  if (!token && !deviceId) {
    return { revoked: false, reason: "missing-local-token" };
  }

  await api.delete("/v1/users/push-token", {
    data: {
      token,
      provider: "expo",
      deviceId,
    },
  });

  await AsyncStorage.removeItem(LAST_TOKEN_KEY);

  return { revoked: true };
}

export async function revokeStoredExpoPushTokenSafely() {
  try {
    return await revokeStoredExpoPushToken();
  } catch (error) {
    console.warn("Push token revoke skipped:", error.message);
    return { revoked: false, reason: "revoke-failed" };
  }
}

export function addPushNotificationResponseListener(onOpenNotification) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    onOpenNotification(data);
  });

  return () => subscription.remove();
}

export async function getLastPushNotificationResponseData() {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data || null;
}
