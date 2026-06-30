import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORED_TOKEN_KEY = "innova_expo_push_token";
export const PROTOCOL_ALERTS_CHANNEL_ID = "protocol-alerts-v3";
export const PROTOCOL_ALERT_SOUND = "protocol-rington.wav";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

async function loadNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }

  const Notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

export async function getStoredExpoPushTokenAsync() {
  return SecureStore.getItemAsync(STORED_TOKEN_KEY);
}

export async function storeExpoPushTokenAsync(token: string) {
  await SecureStore.setItemAsync(STORED_TOKEN_KEY, token);
}

export async function clearStoredExpoPushTokenAsync() {
  await SecureStore.deleteItemAsync(STORED_TOKEN_KEY);
}

export async function getExpoPushTokenAsync() {
  const Notifications = await loadNotificationsModule();
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Expo projectId not found.");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await storeExpoPushTokenAsync(token.data);
  return token.data;
}

export async function ensureAndroidNotificationChannelAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  const Notifications = await loadNotificationsModule();
  await Notifications.setNotificationChannelAsync(PROTOCOL_ALERTS_CHANNEL_ID, {
    name: "Recordatorios de protocolos",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 450, 180, 450, 180, 650],
    lightColor: "#C9A13B",
    sound: PROTOCOL_ALERT_SOUND,
  });
}

export async function configureNotificationHandler() {
  await loadNotificationsModule();
}

export async function getNotificationsModule() {
  return loadNotificationsModule();
}

export type ExpoPushNotificationPayload = {
  title: string;
  subtitle?: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
  sound?: string | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  badge?: number;
  ttl?: number;
};

export async function sendExpoPushNotificationAsync(
  expoPushToken: string,
  payload: ExpoPushNotificationPayload,
) {
  const message: Record<string, unknown> = {
    to: expoPushToken,
    sound: payload.sound ?? "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  };

  if (payload.subtitle) {
    message.subtitle = payload.subtitle;
  }

  if (payload.channelId) {
    message.channelId = payload.channelId;
  }

  if (payload.priority) {
    message.priority = payload.priority;
  }

  if (typeof payload.badge === "number") {
    message.badge = payload.badge;
  }

  if (typeof payload.ttl === "number") {
    message.ttl = payload.ttl;
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Expo push send failed: ${response.status} ${responseText}`,
    );
  }

  return responseText;
}

export type ProtocolReminderNotificationPayload = ExpoPushNotificationPayload & {
  data: {
    kind: "protocol_reminder";
    route: "/protocols";
    openProtocolModal: "1";
    notificationId: string;
    protocolExecutionId: string;
    protocolTitle: string;
    protocolDescription: string;
    protocolScheduledFor?: string;
    protocolScheduledTimeZone?: string;
  };
};

export function buildProtocolReminderNotificationPayload(options: {
  notificationId?: string;
  protocolExecutionId?: string;
  protocolTitle?: string;
  protocolDescription?: string;
  protocolScheduledFor?: string;
  protocolScheduledTimeZone?: string;
  ttl?: number;
} = {}): ProtocolReminderNotificationPayload {
  const protocolExecutionId =
    options.protocolExecutionId ?? String(Date.now());
  const protocolTitle =
    options.protocolTitle ?? "Recordatorio de protocolo";
  const protocolDescription =
    options.protocolDescription ??
    "Ya escaneaste las propiedades de YMP. Abre el formulario para responder.";
  const notificationId = options.notificationId ?? String(Date.now());

  return {
    title: "YMP | Protocolo pendiente",
    subtitle: "Toca para abrir el formulario",
    body: protocolDescription,
    sound: PROTOCOL_ALERT_SOUND,
    channelId: PROTOCOL_ALERTS_CHANNEL_ID,
    priority: "high",
    ttl: options.ttl ?? 60 * 60 * 24,
    data: {
      kind: "protocol_reminder",
      route: "/protocols",
      openProtocolModal: "1",
      notificationId,
      protocolExecutionId,
      protocolTitle,
      protocolDescription,
      protocolScheduledFor: options.protocolScheduledFor,
      protocolScheduledTimeZone: options.protocolScheduledTimeZone,
    },
  };
}
