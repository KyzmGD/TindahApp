import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

let pendingNotificationData = null;

function getStringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function navigateFromNotificationData(data = {}) {
  const type = getStringValue(data.type);
  const matchId = getStringValue(data.matchId);

  if (!type) {
    return false;
  }

  if (!navigationRef.isReady()) {
    pendingNotificationData = data;
    return false;
  }

  if (matchId) {
    navigationRef.navigate("Chat", {
      matchId,
      notificationType: type,
      messageId: getStringValue(data.messageId),
    });
    return true;
  }

  navigationRef.navigate("Main", { screen: "Matches" });
  return true;
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationData || !navigationRef.isReady()) {
    return false;
  }

  const data = pendingNotificationData;
  pendingNotificationData = null;
  return navigateFromNotificationData(data);
}
