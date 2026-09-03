import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useRootNavigationState, useRouter } from "expo-router";

import DeviceIdentitySetupModal from "./DeviceIdentitySetupModal";
import { recordDiagnostic } from "../../utils/diagnostics";
import {
  configureNotificationHandler,
  ensureAndroidNotificationChannelAsync,
  getExpoPushTokenAsync,
  getNotificationsModule,
} from "../../utils/pushNotifications";
import {
  getDeviceIdentityAsync,
  storeDeviceNameAsync,
} from "../../utils/deviceIdentity";
import { resolveApiBaseUrl } from "../../utils/apiBaseUrl";
import { MONITOR_USER_ID } from "../../utils/monitorIdentity";

const API_URL = resolveApiBaseUrl();

async function registerTokenWithBackend(params: {
  token: string;
  deviceId: string;
  deviceName: string;
}) {
  const response = await fetch(
    `${API_URL.replace(/\/$/, "")}/mobile/push-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Userid: String(MONITOR_USER_ID),
      },
      body: JSON.stringify({
        expoPushToken: params.token,
        deviceId: params.deviceId,
        deviceName: params.deviceName,
        platform: Platform.OS,
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[device.identity] token registration failed", {
      status: response.status,
      responseText,
    });
    throw new Error(
      `Push token registration failed: ${response.status} ${responseText}`,
    );
  }

}

type NotificationPayload = {
  kind?: string;
  route?: string;
  openProtocolModal?: string | boolean;
  protocolTitle?: string;
  protocolDescription?: string;
  protocolExecutionId?: string;
  notificationId?: string;
  protocolScheduledFor?: string;
  protocolScheduledTimeZone?: string;
};

function buildProtocolRoute(data?: NotificationPayload, notificationKey?: string) {
  const shouldOpenProtocol =
    data?.kind === "protocol_reminder" ||
    Boolean(data?.route) ||
    Boolean(data?.openProtocolModal) ||
      Boolean(data?.protocolTitle) ||
      Boolean(data?.protocolDescription) ||
      Boolean(data?.protocolExecutionId);

  if (!shouldOpenProtocol) {
    return null;
  }

  return {
    pathname: "/protocols" as const,
    params: {
      openProtocolModal: data?.openProtocolModal ? "1" : undefined,
      protocolTitle: data?.protocolTitle ? String(data.protocolTitle) : undefined,
      protocolDescription: data?.protocolDescription
        ? String(data.protocolDescription)
        : undefined,
      protocolExecutionId: data?.protocolExecutionId
        ? String(data.protocolExecutionId)
        : undefined,
      protocolScheduledFor: data?.protocolScheduledFor
        ? String(data.protocolScheduledFor)
        : undefined,
      protocolScheduledTimeZone: data?.protocolScheduledTimeZone
        ? String(data.protocolScheduledTimeZone)
        : undefined,
      notificationId: notificationKey
        ? String(notificationKey)
        : data?.notificationId
          ? String(data.notificationId)
          : undefined,
    },
  };
}

export default function PushNotificationCoordinator() {
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const lastRegisteredIdentityRef = useRef<string | null>(null);
  const pendingNotificationRef = useRef<NotificationPayload | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>("");
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [deviceSetupVisible, setDeviceSetupVisible] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const canNavigate = Boolean(rootNavigationState?.key);

  const openProtocolFlow = useCallback(
    (data?: NotificationPayload, notificationKey?: string) => {
      const target = buildProtocolRoute(data, notificationKey);

      if (!canNavigate) {
        pendingNotificationRef.current = data ?? null;
        return;
      }

      if (!target) {
        router.replace("/protocols");
        return;
      }

      router.replace(target);
    },
    [canNavigate, router],
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const identity = await getDeviceIdentityAsync();
        if (!mounted) {
          return;
        }

        setDeviceId(identity.deviceId);
        setDeviceName(identity.deviceName ?? "");
        setDeviceSetupVisible(!identity.deviceName);
        setIdentityLoaded(true);
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error);
        recordDiagnostic({
          source: "device.identity",
          message: "No se pudo preparar la identidad del dispositivo.",
          error,
          extra: errorText,
        });
        if (mounted) {
          setIdentityLoaded(true);
          setDeviceSetupVisible(true);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!identityLoaded || !deviceId || !deviceName) {
      return;
    }

    const identityKey = `${deviceId}:${deviceName}`;
    if (lastRegisteredIdentityRef.current === identityKey) {
      return;
    }

    let mounted = true;
    let responseSubscription: { remove: () => void } | null = null;
    let receivedSubscription: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        await configureNotificationHandler();
        await ensureAndroidNotificationChannelAsync();

        const token = await getExpoPushTokenAsync();
        if (token && mounted) {
          lastRegisteredIdentityRef.current = identityKey;
          await registerTokenWithBackend({
            token,
            deviceId,
            deviceName,
          });
        }

        const Notifications = await getNotificationsModule();

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const lastData = lastResponse?.notification.request.content.data as
          | NotificationPayload
          | undefined;
        const lastKey = lastResponse?.notification.request.identifier;

        if (mounted && lastData) {
          openProtocolFlow(lastData, lastKey);
          await Notifications.clearLastNotificationResponseAsync();
        }

        receivedSubscription = Notifications.addNotificationReceivedListener(
          (notification) => {
            const data = notification.request.content.data as
              | NotificationPayload
              | undefined;

            openProtocolFlow(data, notification.request.identifier);
          },
        );

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as
              | NotificationPayload
              | undefined;

            openProtocolFlow(data, response.notification.request.identifier);
            void Notifications.clearLastNotificationResponseAsync();
          });
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error);
        recordDiagnostic({
          source: "push.setup",
          message: errorText.includes("FirebaseApp is not initialized")
            ? "Falta configurar Firebase en Android para registrar el token push."
            : "No se pudo configurar el registro de notificaciones.",
          error,
          extra: errorText.includes("FirebaseApp is not initialized")
            ? "Agrega google-services.json y vuelve a compilar el APK."
            : undefined,
        });
      }
    };

    void setup();

    return () => {
      mounted = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [deviceId, deviceName, identityLoaded, openProtocolFlow]);

  useEffect(() => {
    if (!canNavigate || !pendingNotificationRef.current) {
      return;
    }

    const pending = pendingNotificationRef.current;
    pendingNotificationRef.current = null;
    openProtocolFlow(pending);
  }, [canNavigate, openProtocolFlow]);

  const handleSaveDeviceName = useCallback(async () => {
    const trimmed = deviceName.trim();
    if (trimmed.length < 2 || isSavingIdentity) {
      return;
    }

    setIsSavingIdentity(true);
    try {
      const saved = await storeDeviceNameAsync(trimmed);
      setDeviceId(saved.deviceId);
      setDeviceName(saved.deviceName);
      setDeviceSetupVisible(false);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error("[device.identity] failed to save device name", error);
      recordDiagnostic({
        source: "device.identity.save",
        message: "No se pudo guardar el nombre del dispositivo.",
        error,
        extra: errorText,
      });
    } finally {
      setIsSavingIdentity(false);
    }
  }, [deviceName, isSavingIdentity]);

  return (
    <View pointerEvents="box-none">
      <DeviceIdentitySetupModal
        visible={deviceSetupVisible}
        value={deviceName}
        onChange={setDeviceName}
        onSave={handleSaveDeviceName}
        isSaving={isSavingIdentity}
      />
    </View>
  );
}
