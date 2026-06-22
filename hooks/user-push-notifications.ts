
import { useCallback, useEffect, useRef, useState } from "react";

import type { ExpoPushNotificationPayload } from "../utils/pushNotifications";
import {
  configureNotificationHandler,
  ensureAndroidNotificationChannelAsync,
  getExpoPushTokenAsync,
  getNotificationsModule,
  sendExpoPushNotificationAsync,
} from "../utils/pushNotifications";

type ExpoNotification = import("expo-notifications").Notification;
type ExpoNotificationResponse = import("expo-notifications").NotificationResponse;

export type UsePushNotificationsOptions = {
  autoRegister?: boolean;
  autoListen?: boolean;
  onTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: ExpoNotification) => void;
  onNotificationResponse?: (response: ExpoNotificationResponse) => void;
};

export type UsePushNotificationsResult = {
  expoPushToken: string | null;
  latestNotification: ExpoNotification | null;
  latestResponse: ExpoNotificationResponse | null;
  isRegistering: boolean;
  error: string | null;
  registerForPushNotifications: () => Promise<string | null>;
  sendPushNotification: (
    payload: ExpoPushNotificationPayload,
    token?: string,
  ) => Promise<void>;
  clearError: () => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const usePushNotifications = (
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsResult => {
  const {
    autoRegister = true,
    autoListen = true,
    onTokenReceived,
    onNotificationReceived,
    onNotificationResponse,
  } = options;

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] =
    useState<ExpoNotification | null>(null);
  const [latestResponse, setLatestResponse] =
    useState<ExpoNotificationResponse | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const registerForPushNotifications = useCallback(async () => {
    setIsRegistering(true);
    setError(null);

    try {
      await configureNotificationHandler();
      await ensureAndroidNotificationChannelAsync();

      const token = await getExpoPushTokenAsync();

      if (mountedRef.current) {
        setExpoPushToken(token);
      }

      if (token) {
        onTokenReceived?.(token);
      }

      return token;
    } catch (err) {
      const message = getErrorMessage(err);

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current) {
        setIsRegistering(false);
      }
    }
  }, [onTokenReceived]);

  const sendPushNotification = useCallback(
    async (payload: ExpoPushNotificationPayload, token?: string) => {
      const targetToken = token ?? expoPushToken;

      if (!targetToken) {
        throw new Error("No hay un token Expo disponible para enviar la notificacion.");
      }

      await sendExpoPushNotificationAsync(targetToken, payload);
    },
    [expoPushToken],
  );

  useEffect(() => {
    if (!autoRegister) {
      return;
    }

    void registerForPushNotifications().catch((err) => {
      if (mountedRef.current) {
        setError(getErrorMessage(err));
      }
    });
  }, [autoRegister, registerForPushNotifications]);

  useEffect(() => {
    if (!autoListen) {
      return;
    }

    let notificationSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;
    let cancelled = false;

    const setupListeners = async () => {
      const Notifications = await getNotificationsModule();

      if (cancelled || !mountedRef.current) {
        return;
      }

      notificationSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          if (!mountedRef.current) {
            return;
          }

          setLatestNotification(notification);
          onNotificationReceived?.(notification);
        },
      );

      responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          if (!mountedRef.current) {
            return;
          }

          setLatestResponse(response);
          onNotificationResponse?.(response);
        },
      );
    };

    void setupListeners().catch((err) => {
      if (mountedRef.current) {
        setError(getErrorMessage(err));
      }
    });

    return () => {
      cancelled = true;
      notificationSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [autoListen, onNotificationReceived, onNotificationResponse]);

  return {
    expoPushToken,
    latestNotification,
    latestResponse,
    isRegistering,
    error,
    registerForPushNotifications,
    sendPushNotification,
    clearError,
  };
};
