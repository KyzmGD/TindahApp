const EXPO_PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

let expoClientPromise;
let expoClientForTesting;

function isExpoPushToken(token) {
  return typeof token === "string" && EXPO_PUSH_TOKEN_PATTERN.test(token.trim());
}

function getPlainObject(value) {
  return value?.toObject?.() || value || {};
}

function normalizeRecipientList(recipients) {
  if (!recipients) {
    return [];
  }

  return Array.isArray(recipients) ? recipients : [recipients];
}

function getActiveExpoPushTokens(recipients) {
  const tokens = [];

  normalizeRecipientList(recipients).forEach((recipient) => {
    if (typeof recipient === "string") {
      tokens.push(recipient.trim());
      return;
    }

    const plainRecipient = getPlainObject(recipient);
    const pushTokens = Array.isArray(plainRecipient.pushTokens)
      ? plainRecipient.pushTokens
      : [];

    pushTokens.forEach((entry) => {
      const plainEntry = getPlainObject(entry);

      if (
        (plainEntry.provider || "expo") === "expo" &&
        !plainEntry.disabled &&
        !plainEntry.revokedAt &&
        isExpoPushToken(plainEntry.token)
      ) {
        tokens.push(plainEntry.token.trim());
      }
    });
  });

  return [...new Set(tokens.filter(isExpoPushToken))];
}

function normalizeNotificationPayload(notification = {}) {
  const data = notification.data && typeof notification.data === "object"
    ? notification.data
    : {};

  return {
    title: typeof notification.title === "string" ? notification.title.trim() : "",
    body: typeof notification.body === "string" ? notification.body.trim() : "",
    data,
    sound: notification.sound === undefined ? "default" : notification.sound,
    channelId: notification.channelId,
    priority: notification.priority,
  };
}

function buildExpoPushMessages(tokens, notification = {}) {
  const normalizedNotification = normalizeNotificationPayload(notification);

  return [...new Set(tokens.filter(isExpoPushToken))].map((token) => {
    const message = {
      to: token,
      sound: normalizedNotification.sound,
      title: normalizedNotification.title,
      body: normalizedNotification.body,
      data: normalizedNotification.data,
    };

    if (normalizedNotification.channelId) {
      message.channelId = normalizedNotification.channelId;
    }

    if (normalizedNotification.priority) {
      message.priority = normalizedNotification.priority;
    }

    return message;
  });
}

async function createExpoClient() {
  const sdk = await import("expo-server-sdk");
  const Expo = sdk.Expo || sdk.default?.Expo || sdk.default;

  return new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
  });
}

async function getExpoClient() {
  if (expoClientForTesting) {
    return expoClientForTesting;
  }

  if (!expoClientPromise) {
    expoClientPromise = createExpoClient();
  }

  return expoClientPromise;
}

function collectTicketErrors(tickets = []) {
  return tickets
    .filter((ticket) => ticket?.status === "error")
    .map((ticket) => ({
      message: ticket.message || "Expo push notification failed",
      details: ticket.details,
    }));
}

async function sendExpoPushNotifications(recipients, notification = {}) {
  const tokens = getActiveExpoPushTokens(recipients);
  const result = {
    requested: tokens.length,
    sent: 0,
    tickets: [],
    errors: [],
  };

  if (!tokens.length) {
    return result;
  }

  let expoClient;

  try {
    expoClient = await getExpoClient();
  } catch (error) {
    console.error("Push notification client unavailable:", error.message);
    result.errors.push({ message: error.message });
    return result;
  }

  const messages = buildExpoPushMessages(tokens, notification);
  const chunks = typeof expoClient.chunkPushNotifications === "function"
    ? expoClient.chunkPushNotifications(messages)
    : [messages];

  for (const chunk of chunks) {
    try {
      const tickets = await expoClient.sendPushNotificationsAsync(chunk);
      const ticketErrors = collectTicketErrors(tickets);

      result.tickets.push(...tickets);
      result.errors.push(...ticketErrors);
      result.sent += tickets.length - ticketErrors.length;
    } catch (error) {
      console.error("Push notification send failed:", error.message);
      result.errors.push({ message: error.message });
    }
  }

  return result;
}

function setExpoClientForTesting(client) {
  expoClientForTesting = client;
  expoClientPromise = null;
}

function resetExpoClientForTesting() {
  expoClientForTesting = null;
  expoClientPromise = null;
}

module.exports = {
  buildExpoPushMessages,
  getActiveExpoPushTokens,
  isExpoPushToken,
  resetExpoClientForTesting,
  sendExpoPushNotifications,
  setExpoClientForTesting,
};
