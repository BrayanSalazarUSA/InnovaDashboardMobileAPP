import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiService } from "@/services/api";
import { ProtocolExecutionResponse, ProtocolsApi } from "@/services/protocols";
import "../../global.css";
import { getDeviceIdentityAsync } from "../../utils/deviceIdentity";
import { recordDiagnostic } from "../../utils/diagnostics";
import { MONITOR_ROLE, MONITOR_USER_ID } from "../../utils/monitorIdentity";
import { getStoredExpoPushTokenAsync } from "../../utils/pushNotifications";
import AppVersionFooter from "../_components/AppVersionFooter";
import ProtocolReminderModal from "../components/ui/ProtocolReminderModal";

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Monitor = {
  id: number | string;
  name: string;
  image?: string;
  email?: string;
};

type ReminderProtocol = {
  id: string;
  title: string;
  description?: string;
  scheduledFor?: string;
  scheduledTimeZone?: string;
};

type ResponseDisplayOverride = {
  respondedByName?: string;
  respondedByDeviceId?: string;
  respondedByDeviceName?: string;
};

const EARLY_RESPONSE_WINDOW_MINUTES = 60;
const LATE_RESPONSE_GRACE_MINUTES = 180;

const STATUS_META: Record<
  ProtocolExecutionResponse["status"] | "SCHEDULED",
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
  }
> = {
  PENDING: {
    label: "Pendiente",
    color: "#B91C1C",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "clock-outline",
  },
  ANSWERED: {
    label: "Respondido",
    color: "#15803D",
    bg: "#ECFDF5",
    border: "#86EFAC",
    icon: "check-circle-outline",
  },
  IGNORED: {
    label: "Ignorado",
    color: "#991B1B",
    bg: "#FEE2E2",
    border: "#FCA5A5",
    icon: "close-circle-outline",
  },
  SCHEDULED: {
    label: "Programado",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "clock-time-four-outline",
  },
};

function getStatusMeta(
  status: ProtocolExecutionResponse["status"] | "SCHEDULED",
) {
  return STATUS_META[status] || STATUS_META.PENDING;
}

function isWithinResponseGraceWindow(
  item: ProtocolExecutionResponse,
  referenceMoment: Date,
) {
  if (!item.scheduledFor) {
    return true;
  }

  const scheduled = new Date(item.scheduledFor);
  if (
    Number.isNaN(scheduled.getTime()) ||
    Number.isNaN(referenceMoment.getTime())
  ) {
    return true;
  }

  const deadline = new Date(scheduled.getTime());
  deadline.setMinutes(deadline.getMinutes() + LATE_RESPONSE_GRACE_MINUTES);
  return referenceMoment.getTime() <= deadline.getTime();
}

function isResponseWindowNotYetOpen(
  item: ProtocolExecutionResponse,
  referenceMoment: Date,
) {
  if (!item.scheduledFor) {
    return false;
  }

  const scheduled = new Date(item.scheduledFor);
  if (
    Number.isNaN(scheduled.getTime()) ||
    Number.isNaN(referenceMoment.getTime())
  ) {
    return false;
  }

  const openAt = new Date(scheduled.getTime());
  openAt.setMinutes(openAt.getMinutes() - EARLY_RESPONSE_WINDOW_MINUTES);
  return referenceMoment.getTime() < openAt.getTime();
}

function getEffectiveStatus(
  item: ProtocolExecutionResponse,
  referenceMoment: Date = new Date(),
) {
  if (
    item.status === "ANSWERED" ||
    Boolean(item.responseValue) ||
    Boolean(item.respondedAt)
  ) {
    return "ANSWERED";
  }

  if (isResponseWindowNotYetOpen(item, referenceMoment)) {
    return "SCHEDULED";
  }

  if (
    item.status === "IGNORED" &&
    isWithinResponseGraceWindow(item, referenceMoment)
  ) {
    return "PENDING";
  }

  return item.status;
}

function canOpenExecution(
  item: ProtocolExecutionResponse,
  referenceMoment: Date = new Date(),
) {
  return getEffectiveStatus(item, referenceMoment) === "PENDING";
}

function getTimeLabel(value?: string) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, delta: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDaySelectorLabel(date: Date, today: Date) {
  const normalizedDate = startOfLocalDay(date);
  const normalizedToday = startOfLocalDay(today);
  const diffDays = Math.round(
    (normalizedDate.getTime() - normalizedToday.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Hoy";
  if (diffDays === -1) return "Ayer";
  if (diffDays === 1) return "Mañana";

  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

type TimelineRowProps = {
  item: ProtocolExecutionResponse;
  onPress: (item: ProtocolExecutionResponse) => void;
};

const TimelineRow = React.memo(function TimelineRow({
  item,
  onPress,
}: TimelineRowProps) {
  const displayStatus = getEffectiveStatus(item);
  const statusMeta = getStatusMeta(displayStatus);
  const isAnswered = displayStatus === "ANSWERED";
  const hourLabel = getTimeLabel(item.scheduledFor);
  const helperLabel = isAnswered
    ? "Respondido"
    : displayStatus === "IGNORED"
      ? "Vencido"
      : displayStatus === "SCHEDULED"
        ? `Disponible desde las ${hourLabel}`
        : "Toca para responder ahora";
  const responderName = item.respondedByName || "Respondido";
  const responderDeviceName =
    item.respondedByDeviceName || "Dispositivo sin nombre";
  const contentLabel = isAnswered
    ? item.responseNote || "Sin detalle adicional."
    : item.responseNote || "Sin descripción registrada.";

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.88}
      className="mb-3 flex-row overflow-hidden rounded-[22px] bg-white"
      style={{
        borderWidth: 1,
        borderColor: statusMeta.border,
      }}
    >
      <View className="w-[6px]" style={{ backgroundColor: statusMeta.color }} />

      <View
        className="w-[72px] items-center justify-center px-2 py-4"
        style={{ backgroundColor: statusMeta.bg }}
      >
        <View
          className="rounded-[18px] px-2 py-2 items-center"
          style={{
            backgroundColor: statusMeta.color,
          }}
        >
          <Text className="text-[11px] font-bold text-white leading-4 text-center">
            {hourLabel}
          </Text>
          <MaterialCommunityIcons
            name={statusMeta.icon}
            size={14}
            color="white"
          />
        </View>
      </View>

      <View className="flex-1 px-4 py-4 justify-center">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0 pr-1">
            <Text
              className="text-[15px] font-bold leading-5 text-[#0F172A]"
              numberOfLines={3}
            >
              {item.protocolTitle || "Protocolo"}
            </Text>
            <Text className="mt-1 text-sm text-[#475569]" numberOfLines={1}>
              {helperLabel}
            </Text>
            {isAnswered ? (
              <>
                <Text
                  className="mt-2 text-sm font-semibold text-[#0F172A]"
                  numberOfLines={1}
                >
                  {responderName}
                </Text>
                <Text className="mt-1 text-xs text-[#64748B]" numberOfLines={1}>
                  {responderDeviceName}
                </Text>
                <Text className="mt-1 text-xs text-[#64748B]" numberOfLines={2}>
                  {contentLabel}
                </Text>
              </>
            ) : (
              <Text className="mt-2 text-xs text-[#64748B]" numberOfLines={1}>
                {contentLabel}
              </Text>
            )}
          </View>

          <View
            className="rounded-full px-2.5 py-1.5 self-start mt-1"
            style={{ backgroundColor: statusMeta.color }}
          >
            <Text className="text-[11px] font-semibold text-white">
              {statusMeta.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ProtocolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    openProtocolModal?: string | string[];
    protocolTitle?: string | string[];
    protocolDescription?: string | string[];
    protocolExecutionId?: string | string[];
    notificationId?: string | string[];
    protocolScheduledFor?: string | string[];
    protocolScheduledTimeZone?: string | string[];
  }>();
  const [responses, setResponses] = useState<ProtocolExecutionResponse[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [reminderProtocol, setReminderProtocol] =
    useState<ReminderProtocol | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedExecution, setSelectedExecution] =
    useState<ProtocolExecutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [currentMoment, setCurrentMoment] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() =>
    startOfLocalDay(new Date()),
  );
  const [responseDisplayOverrides, setResponseDisplayOverrides] = useState<
    Record<number, ResponseDisplayOverride>
  >({});
  const lastOpenedNotificationRef = React.useRef<string | null>(null);
  const openReminderKeyRef = React.useRef<string | null>(null);
  const saveNoticeTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const normalizedParams = useMemo(() => {
    const getValue = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] : value;

    return {
      openProtocolModal: getValue(params.openProtocolModal),
      protocolTitle: getValue(params.protocolTitle),
      protocolDescription: getValue(params.protocolDescription),
      protocolExecutionId: getValue(params.protocolExecutionId),
      notificationId: getValue(params.notificationId),
      protocolScheduledFor: getValue(params.protocolScheduledFor),
      protocolScheduledTimeZone: getValue(params.protocolScheduledTimeZone),
    };
  }, [params]);

  const closeReminder = useCallback(() => {
    setReminderVisible(false);
    setReminderProtocol(null);
    openReminderKeyRef.current = null;
    router.replace("/protocols");
  }, [router]);

  const showSaveNotice = useCallback((message: string) => {
    setSaveNotice(message);
    if (saveNoticeTimeoutRef.current) {
      clearTimeout(saveNoticeTimeoutRef.current);
    }
    saveNoticeTimeoutRef.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimeoutRef.current = null;
    }, 2600);
  }, []);

  const loadResponses = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const identity = await getDeviceIdentityAsync();
      const currentExpoPushToken = await getStoredExpoPushTokenAsync();
      console.log("[protocols.loadResponses] requesting recent responses", {
        silent,
        deviceId: identity.deviceId,
        deviceName: identity.deviceName,
        expoPushTokenPreview: currentExpoPushToken
          ? `${currentExpoPushToken.slice(0, 8)}...${currentExpoPushToken.slice(-4)}`
          : null,
      });
      const all = await ProtocolsApi.recentResponses(168, {
        userId: MONITOR_USER_ID,
        role: MONITOR_ROLE,
        deviceId: identity.deviceId,
        expoPushToken: currentExpoPushToken,
        deviceName: identity.deviceName,
      });
      console.log("[protocols.loadResponses] backend response", {
        count: Array.isArray(all) ? all.length : null,
        sample: Array.isArray(all) ? all.slice(0, 3) : all,
      });
      const normalized = Array.isArray(all) ? all : [];
      setResponses(normalized);
    } catch (error) {
      recordDiagnostic({
        source: "protocols.loadResponses",
        message: "No se pudieron cargar las respuestas de protocolos.",
        error,
      });
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await ApiService.getMonitors();
      const normalized = Array.isArray(data) ? data : [];
      setMonitors(normalized);
    } catch (error) {
      recordDiagnostic({
        source: "protocols.loadMonitors",
        message: "No se pudieron cargar los monitores.",
        error,
      });
    }
  }, []);

  const openExecutionProtocol = useCallback(
    (item: ProtocolExecutionResponse) => {
      const effectiveStatus = getEffectiveStatus(item, currentMoment);
      if (effectiveStatus !== "PENDING") {
        Alert.alert(
          "Protocolo no disponible",
          effectiveStatus === "IGNORED"
            ? "Este protocolo ya no está pendiente para este dispositivo."
            : effectiveStatus === "SCHEDULED"
              ? "Este protocolo todavía no está habilitado. Vuelve cuando falte 1 hora o menos para su hora programada."
              : "Este protocolo ya fue respondido.",
        );
        return;
      }

      const reminderKey = String(item.id);
      if (reminderVisible) {
        return;
      }

      lastOpenedNotificationRef.current = reminderKey;
      openReminderKeyRef.current = reminderKey;
      setReminderProtocol({
        id: reminderKey,
        title: item.protocolTitle || "Recordatorio de protocolo",
        description:
          item.content ||
          "Completa el protocolo desde este formulario y deja el registro al instante.",
        scheduledFor: item.scheduledFor,
        scheduledTimeZone: item.scheduledTimeZone,
      });
      setReminderVisible(true);
    },
    [currentMoment, reminderVisible],
  );

  const openExecutionDetails = useCallback(
    (item: ProtocolExecutionResponse) => {
      setSelectedExecution(item);
      setDetailVisible(true);
    },
    [],
  );

  const closeExecutionDetails = useCallback(() => {
    setDetailVisible(false);
    setSelectedExecution(null);
  }, []);

  useEffect(() => {
    void loadResponses(false);
  }, [loadResponses]);

  useFocusEffect(
    useCallback(() => {
      void loadResponses(true);

      const interval = setInterval(() => {
        void loadResponses(true);
      }, 45000);

      return () => {
        clearInterval(interval);
      };
    }, [loadResponses]),
  );

  useEffect(() => {
    void loadMonitors();
  }, [loadMonitors]);

  useEffect(() => {
    return () => {
      if (saveNoticeTimeoutRef.current) {
        clearTimeout(saveNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMoment(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const shouldOpen =
      normalizedParams.openProtocolModal === "1" ||
      normalizedParams.openProtocolModal === "true" ||
      Boolean(normalizedParams.protocolExecutionId) ||
      Boolean(normalizedParams.protocolTitle) ||
      Boolean(normalizedParams.protocolDescription);

    if (!shouldOpen) {
      return;
    }

    const notificationKey =
      normalizedParams.notificationId ||
      normalizedParams.protocolExecutionId ||
      normalizedParams.protocolTitle ||
      "protocol-modal";

    if (lastOpenedNotificationRef.current === notificationKey) {
      return;
    }

    lastOpenedNotificationRef.current = notificationKey;
    setReminderProtocol({
      id:
        normalizedParams.protocolExecutionId ||
        normalizedParams.notificationId ||
        String(Date.now()),
      title: normalizedParams.protocolTitle || "Recordatorio de protocolo",
      description:
        normalizedParams.protocolDescription ||
        "Completa el protocolo desde este formulario y deja el registro al instante.",
      scheduledFor: normalizedParams.protocolScheduledFor,
      scheduledTimeZone: normalizedParams.protocolScheduledTimeZone,
    });
    setReminderVisible(true);
  }, [normalizedParams]);

  const handleReminderSave = useCallback(
    async (answer: "sí" | "no", note: string, respondedBy: string) => {
      if (!reminderProtocol) {
        throw new Error("No hay un protocolo activo para guardar.");
      }

      const executionId = Number(reminderProtocol.id);
      if (Number.isNaN(executionId)) {
        throw new Error("El identificador del protocolo no es válido.");
      }

      try {
        const identity = await getDeviceIdentityAsync();
        const expoPushToken = await getStoredExpoPushTokenAsync();
        console.log("[protocols.handleReminderSave] sending response", {
          executionId,
          answer,
          respondedBy,
          deviceId: identity.deviceId,
          deviceName: identity.deviceName,
          expoPushTokenPreview: expoPushToken
            ? `${expoPushToken.slice(0, 8)}...${expoPushToken.slice(-4)}`
            : null,
        });
        await ProtocolsApi.respond(
          executionId,
          {
            responseValue: answer === "sí" ? "YES" : "NO",
            responseNote: note,
            responderName: respondedBy,
            deviceId: identity.deviceId ?? undefined,
            expoPushToken: expoPushToken ?? undefined,
            deviceName: identity.deviceName ?? undefined,
          },
          { userId: MONITOR_USER_ID, role: MONITOR_ROLE },
        );
        console.log("[protocols.handleReminderSave] response sent", {
          executionId,
          deviceId: identity.deviceId,
          deviceName: identity.deviceName,
        });

        setResponseDisplayOverrides((current) => ({
          ...current,
          [executionId]: {
            respondedByName: respondedBy,
            respondedByDeviceId: identity.deviceId ?? undefined,
            respondedByDeviceName: identity.deviceName ?? undefined,
          },
        }));

        await loadResponses();
        const now = new Date().toISOString();
        setResponses((current) =>
          current.map((item) =>
            item.id === executionId
              ? {
                  ...item,
                  status: "ANSWERED",
                  responseValue: answer === "sí" ? "YES" : "NO",
                  responseNote: note,
                  respondedByName: respondedBy,
                  respondedByDeviceId:
                    identity.deviceId ?? item.respondedByDeviceId,
                  respondedByDeviceName:
                    identity.deviceName ?? item.respondedByDeviceName,
                  respondedAt: now,
                }
              : item,
          ),
        );
        setSelectedExecution((current) =>
          current && current.id === executionId
            ? {
                ...current,
                status: "ANSWERED",
                responseValue: answer === "sí" ? "YES" : "NO",
                responseNote: note,
                respondedByName: respondedBy,
                respondedByDeviceId:
                  identity.deviceId ?? current.respondedByDeviceId,
                respondedByDeviceName:
                  identity.deviceName ?? current.respondedByDeviceName,
                respondedAt: now,
              }
            : current,
        );
        showSaveNotice("Respuesta guardada y sincronizada con el backend.");
      } catch (error) {
        recordDiagnostic({
          source: "protocols.modalSave",
          message: "No se pudo guardar la respuesta del modal.",
          error,
        });
        throw error;
      }
    },
    [loadResponses, reminderProtocol, showSaveNotice],
  );

  const timelineProtocols = useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase();
    return [...responses]
      .sort((a, b) => {
        const aTime = new Date(
          a.scheduledFor || a.lastReminderAt || 0,
        ).getTime();
        const bTime = new Date(
          b.scheduledFor || b.lastReminderAt || 0,
        ).getTime();
        return aTime - bTime;
      })
      .filter((item) => {
        if (!lowerSearch) return true;
        return [
          item.protocolTitle,
          item.content,
          item.responseNote,
          item.respondedByName,
          item.responseValue,
          item.status,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(lowerSearch));
      });
  }, [responses, searchQuery]);

  const selectedDayProtocols = useMemo(() => {
    return timelineProtocols.filter((item) => {
      const itemDate = new Date(item.scheduledFor || item.lastReminderAt || 0);
      return isSameLocalDay(itemDate, selectedDay);
    });
  }, [selectedDay, timelineProtocols]);

  const visibleProtocols = useMemo(() => {
    return selectedDayProtocols.map((item) => {
      const override = responseDisplayOverrides[item.id];
      return override ? { ...item, ...override } : item;
    });
  }, [responseDisplayOverrides, selectedDayProtocols]);

  const selectedDetailMeta = selectedExecution
    ? getStatusMeta(getEffectiveStatus(selectedExecution, currentMoment))
    : STATUS_META.PENDING;

  const currentClockLabel = currentMoment.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDayLabel = currentMoment.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const selectedDayLabel = formatDaySelectorLabel(selectedDay, currentMoment);

  const nextProtocol = useMemo(() => {
    const nowTime = currentMoment.getTime();
    const source = selectedDayProtocols;
    const next = source.find((item) => {
      const itemTime = new Date(
        item.scheduledFor || item.lastReminderAt || 0,
      ).getTime();
      return itemTime >= nowTime && canOpenExecution(item, currentMoment);
    });

    return (
      next ||
      source.find((item) => canOpenExecution(item, currentMoment)) ||
      null
    );
  }, [currentMoment, selectedDayProtocols]);

  const pendingProtocolCount = useMemo(
    () =>
      selectedDayProtocols.filter((item) =>
        canOpenExecution(item, currentMoment),
      ).length,
    [currentMoment, selectedDayProtocols],
  );

  const visibleProtocolCount = visibleProtocols.length;

  const openReminderFromDetail = useCallback(() => {
    if (!selectedExecution) return;
    const effectiveStatus = getEffectiveStatus(
      selectedExecution,
      currentMoment,
    );
    if (effectiveStatus !== "PENDING") {
      Alert.alert(
        "Protocolo no disponible",
        effectiveStatus === "IGNORED"
          ? "Este protocolo ya no está pendiente para este dispositivo."
          : effectiveStatus === "SCHEDULED"
            ? "Este protocolo todavía no está habilitado. Vuelve cuando falte 1 hora o menos para su hora programada."
            : "Este protocolo ya fue respondido.",
      );
      return;
    }
    openExecutionProtocol(selectedExecution);
    closeExecutionDetails();
  }, [
    closeExecutionDetails,
    currentMoment,
    openExecutionProtocol,
    selectedExecution,
  ]);

  const selectedExecutionWithOverride = useMemo(() => {
    if (!selectedExecution) {
      return null;
    }

    const override = responseDisplayOverrides[selectedExecution.id];
    return override ? { ...selectedExecution, ...override } : selectedExecution;
  }, [responseDisplayOverrides, selectedExecution]);

  return (
    <View className="flex-1 bg-[#F5F8FB]">
      {reminderProtocol ? (
        <ProtocolReminderModal
          visible={reminderVisible}
          protocol={reminderProtocol}
          monitors={monitors}
          onClose={closeReminder}
          onSave={handleReminderSave}
        />
      ) : null}

      <Modal
        visible={detailVisible && Boolean(selectedExecutionWithOverride)}
        transparent
        animationType="fade"
        onRequestClose={closeExecutionDetails}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 bg-black/55 items-center justify-center px-4 py-6">
            <TouchableOpacity
              activeOpacity={1}
              onPress={closeExecutionDetails}
              className="absolute inset-0"
            />
            {selectedExecutionWithOverride ? (
              <View className="w-full h-[75%] rounded-[28px] bg-white p-5 shadow-2xl border border-[#E2E8F0] overflow-hidden">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#64748B]">
                      Detalle del protocolo
                    </Text>
                    <Text className="mt-2 text-[22px] font-bold leading-7 text-[#0F172A]">
                      {selectedExecutionWithOverride.protocolTitle ||
                        "Protocolo"}
                    </Text>
                    {getEffectiveStatus(
                      selectedExecutionWithOverride,
                      currentMoment,
                    ) === "SCHEDULED" ? (
                      <Text className="mt-1 text-xs font-medium text-[#1D4ED8]">
                        Disponible para responder desde 1 hora antes de la hora
                        programada.
                      </Text>
                    ) : null}
                  </View>
                  <View
                    className="rounded-full px-3 py-2 flex-row items-center gap-2"
                    style={{ backgroundColor: selectedDetailMeta.bg }}
                  >
                    <MaterialCommunityIcons
                      name={selectedDetailMeta.icon}
                      size={15}
                      color={selectedDetailMeta.color}
                    />
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: selectedDetailMeta.color }}
                    >
                      {selectedDetailMeta.label}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  className="mt-4 flex-1"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingBottom: 12 }}
                >
                  <View className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                    <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                      Resumen
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-[#334155]">
                      {selectedExecution.responseNote ||
                        "Sin descripción registrada."}
                    </Text>
                  </View>

                  <View className="mt-4 rounded-3xl border border-[#E2E8F0] bg-white px-4 py-4">
                    <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                      Respuesta
                    </Text>
                    {getEffectiveStatus(
                      selectedExecutionWithOverride,
                      currentMoment,
                    ) === "ANSWERED" ? (
                      <View className="mt-2">
                        <Text className="text-sm font-semibold text-[#0F172A]">
                          {selectedExecutionWithOverride.respondedByName ||
                            "Respondido"}
                        </Text>
                        <Text className="mt-1 text-sm leading-6 text-[#334155]">
                          {selectedExecutionWithOverride.respondedByDeviceName ||
                            "Dispositivo sin nombre"}
                        </Text>
                        <Text className="mt-2 text-xs text-[#64748B]">
                          Respondido:{" "}
                          {formatDateTime(
                            selectedExecutionWithOverride.respondedAt,
                          )}
                        </Text>
                      </View>
                    ) : (
                      <Text className="mt-2 text-sm leading-6 text-[#334155]">
                        Todavía no se ha guardado una respuesta para este
                        protocolo.
                      </Text>
                    )}
                  </View>
                </ScrollView>

                <View className="mt-4 flex-row gap-3">
                  <TouchableOpacity
                    onPress={closeExecutionDetails}
                    className="flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
                  >
                    <Text className="text-center font-semibold text-[#475569]">
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                  {getEffectiveStatus(
                    selectedExecutionWithOverride,
                    currentMoment,
                  ) === "PENDING" ? (
                    <TouchableOpacity
                      onPress={openReminderFromDetail}
                      className="flex-1 rounded-2xl bg-[#006bb3] px-4 py-3"
                    >
                      <Text className="text-center font-semibold text-white">
                        Completar protocolo
                      </Text>
                    </TouchableOpacity>
                  ) : getEffectiveStatus(
                      selectedExecutionWithOverride,
                      currentMoment,
                    ) === "SCHEDULED" ? (
                    <View className="flex-1 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
                      <Text className="text-center font-semibold text-[#1D4ED8]">
                        Aún no disponible
                      </Text>
                    </View>
                  ) : getEffectiveStatus(
                      selectedExecutionWithOverride,
                      currentMoment,
                    ) === "IGNORED" ? (
                    <View className="flex-1 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                      <Text className="text-center font-semibold text-[#B91C1C]">
                        Vencido para este dispositivo
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FlatList
        data={visibleProtocols}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TimelineRow item={item} onPress={openExecutionDetails} />
        )}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        ListHeaderComponent={
          <View>
            <View className="mb-4 rounded-[28px] bg-white px-5 py-4 shadow-sm border border-[#E2E8F0]">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#B78607]">
                    Guía diaria
                  </Text>
                  <Text className="mt-2 text-[26px] font-bold leading-8 text-[#0F172A]">
                    {currentDayLabel}
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-[#475569]">
                    {currentClockLabel}. Toca un evento para ver qué falta, qué
                    ya se hizo y quién respondió.
                  </Text>
                </View>

                <View className="items-end gap-2">
                  <View className="rounded-2xl bg-[#0F172A] px-3 py-2">
                    <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Ahora {currentClockLabel}
                    </Text>
                  </View>
                  <View className="rounded-2xl bg-[#EFF6FF] px-3 py-2">
                    <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
                      {pendingProtocolCount} pendientes
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
                <TouchableOpacity
                  onPress={() =>
                    setSelectedDay((current) => addDays(current, -1))
                  }
                  className="h-11 w-11 items-center justify-center rounded-full bg-white border border-[#E2E8F0]"
                  accessibilityRole="button"
                  accessibilityLabel="Ver día anterior"
                >
                  <Ionicons name="chevron-back" size={20} color="#1D4ED8" />
                </TouchableOpacity>

                <View className="flex-1 px-3 items-center">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94A3B8]">
                    Día activo
                  </Text>
                  <Text className="mt-1 text-base font-bold text-[#0F172A]">
                    {selectedDayLabel}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setSelectedDay((current) => addDays(current, 1))
                  }
                  className="h-11 w-11 items-center justify-center rounded-full bg-white border border-[#E2E8F0]"
                  accessibilityRole="button"
                  accessibilityLabel="Ver día siguiente"
                >
                  <Ionicons name="chevron-forward" size={20} color="#1D4ED8" />
                </TouchableOpacity>
              </View>

              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedDay(startOfLocalDay(new Date()))}
                  className={`flex-1 rounded-2xl px-3 py-2 ${isSameLocalDay(selectedDay, new Date()) ? "bg-[#0F172A]" : "bg-[#EFF6FF]"}`}
                >
                  <Text
                    className={`text-center text-xs font-semibold uppercase tracking-[0.18em] ${isSameLocalDay(selectedDay, new Date()) ? "text-white" : "text-[#1D4ED8]"}`}
                  >
                    Hoy
                  </Text>
                </TouchableOpacity>
                <View className="flex-1 rounded-2xl bg-[#EFF6FF] px-3 py-2">
                  <Text className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
                    {visibleProtocolCount} visibles
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                    Siguiente tarea
                  </Text>
                  <Text
                    className="mt-1 text-base font-bold text-[#0F172A]"
                    numberOfLines={1}
                  >
                    {nextProtocol?.protocolTitle || "Todo al día"}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-[#475569]"
                    numberOfLines={1}
                  >
                    {nextProtocol
                      ? `${getTimeLabel(nextProtocol.scheduledFor)} · ${getStatusMeta(nextProtocol.status).label}`
                      : "No hay protocolos pendientes para este día"}
                  </Text>
                </View>
                <View className="w-[88px] rounded-3xl border border-[#E2E8F0] bg-[#FEF3C7] px-3 py-3 items-center justify-center">
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={22}
                    color="#B78607"
                  />
                  <Text className="mt-2 text-xs font-semibold text-[#7A5600] text-center">
                    Línea diaria
                  </Text>
                </View>
              </View>
            </View>

            {saveNotice ? (
              <Animated.View
                className="mb-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3"
                style={{ opacity: 1 }}
              >
                <Text className="text-sm font-semibold text-[#166534]">
                  {saveNotice}
                </Text>
              </Animated.View>
            ) : null}

            <View className="mb-4 flex-row items-center rounded-3xl bg-white px-4 py-3 shadow-sm border border-[#E2E8F0]">
              <Ionicons name="search" size={20} color="#2563EB" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar protocolo, nota o persona"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-sm text-[#0F172A] ml-3"
              />
              <TouchableOpacity
                onPress={() => void loadResponses(true)}
                className="rounded-full bg-[#EFF6FF] p-2"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#2563EB" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="min-h-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-sm border border-[#E2E8F0]">
              <ActivityIndicator size="large" color="#C9A13B" />
              <Text className="mt-3 text-[#475569]">
                Cargando protocolos...
              </Text>
            </View>
          ) : (
            <View className="min-h-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-sm border border-[#E2E8F0]">
              <MaterialCommunityIcons
                name="timeline-text-outline"
                size={40}
                color="#1D4ED8"
              />
              <Text className="mt-4 text-center text-[#475569] text-sm">
                No hay protocolos para mostrar en{" "}
                {selectedDayLabel.toLowerCase()}.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<AppVersionFooter />}
      />
    </View>
  );
}
