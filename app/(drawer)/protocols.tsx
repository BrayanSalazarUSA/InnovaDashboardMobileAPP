import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiService } from "@/services/api";
import { ProtocolsApi, ProtocolExecutionResponse } from "@/services/protocols";
import "../../global.css";
import AppVersionFooter from "../_components/AppVersionFooter";
import ProtocolReminderModal from "../components/ui/ProtocolReminderModal";
import { recordDiagnostic } from "../../utils/diagnostics";
import { getStoredDeviceIdAsync } from "../../utils/deviceIdentity";
import { MONITOR_ROLE, MONITOR_USER_ID } from "../../utils/monitorIdentity";

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
};

const USE_MOCK_TIMELINE = false;

function atToday(hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const MOCK_MONITORS: Monitor[] = [
  { id: 2, name: "Alexis Salazar", image: "profiles/alexis.webp" },
  { id: 12, name: "Danny Lopez", image: "profiles/danny.webp" },
  { id: 18, name: "Alejandra Grajales", image: "profiles/alejandra.webp" },
  { id: 26, name: "Maria Fernanda", image: "profiles/maria.webp" },
];

const MOCK_TIMELINE: ProtocolExecutionResponse[] = [
  {
    id: 90101,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(8, 0),
    status: "ANSWERED",
    responseValue: "YES",
    responseNote: "Escaneo realizado sin novedades.",
    respondedByName: "Alexis Salazar",
    respondedAt: atToday(8, 8),
    reminderCount: 1,
    lastReminderAt: atToday(7, 58),
  },
  {
    id: 90102,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(10, 0),
    status: "PENDING",
    reminderCount: 2,
    lastReminderAt: atToday(9, 55),
  },
  {
    id: 90103,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(12, 0),
    status: "ANSWERED",
    responseValue: "YES",
    responseNote: "Todo en orden, sin incidencias.",
    respondedByName: "Danny Lopez",
    respondedAt: atToday(12, 9),
    reminderCount: 1,
    lastReminderAt: atToday(11, 58),
  },
  {
    id: 90104,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(14, 0),
    status: "PENDING",
    reminderCount: 2,
    lastReminderAt: atToday(13, 58),
  },
  {
    id: 90105,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(16, 0),
    status: "PENDING",
    reminderCount: 1,
    lastReminderAt: atToday(15, 58),
  },
  {
    id: 90106,
    protocolId: 1001,
    protocolTitle: "Escaneo de propiedades",
    content: "Revisar propiedades y dejar evidencia del recorrido.",
    scheduledFor: atToday(18, 0),
    status: "PENDING",
    reminderCount: 0,
  },
];

const STATUS_META: Record<
  ProtocolExecutionResponse["status"],
  { label: string; color: string; bg: string; border: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
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
};

function getStatusMeta(status: ProtocolExecutionResponse["status"]) {
  return STATUS_META[status] || STATUS_META.PENDING;
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

type TimelineRowProps = {
  item: ProtocolExecutionResponse;
  onPress: (item: ProtocolExecutionResponse) => void;
};

const TimelineRow = React.memo(function TimelineRow({ item, onPress }: TimelineRowProps) {
  const displayStatus: ProtocolExecutionResponse["status"] =
    item.status === "ANSWERED" || Boolean(item.responseValue) || Boolean(item.respondedAt)
      ? "ANSWERED"
      : item.status;
  const statusMeta = getStatusMeta(displayStatus);
  const isAnswered = displayStatus === "ANSWERED";
  const hourLabel = getTimeLabel(item.scheduledFor);
  const helperLabel = isAnswered
    ? `Respondido por ${item.respondedByName || "el equipo"}`
    : displayStatus === "IGNORED"
      ? "Aún pendiente de completar"
      : "Toca para responder ahora";

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
      <View
        className="w-[6px]"
        style={{ backgroundColor: statusMeta.color }}
      />

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
          <MaterialCommunityIcons name={statusMeta.icon} size={14} color="white" />
        </View>
      </View>

      <View className="flex-1 px-4 py-4 justify-center">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0 pr-2">
            <Text className="text-[15px] font-bold text-[#0F172A]" numberOfLines={1}>
              {item.protocolTitle || "Protocolo"}
            </Text>
            <Text className="mt-1 text-sm text-[#475569]" numberOfLines={1}>
              {helperLabel}
            </Text>
            <Text className="mt-2 text-xs text-[#64748B]" numberOfLines={1}>
              {item.content || "Sin descripción registrada."}
            </Text>
          </View>

          <View
            className="rounded-full px-3 py-2 self-start"
            style={{ backgroundColor: statusMeta.color }}
          >
            <Text className="text-xs font-semibold text-white">
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
  }>();
  const [responses, setResponses] = useState<ProtocolExecutionResponse[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [reminderProtocol, setReminderProtocol] = useState<ReminderProtocol | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<ProtocolExecutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [currentMoment, setCurrentMoment] = useState(() => new Date());
  const lastOpenedNotificationRef = React.useRef<string | null>(null);
  const openReminderKeyRef = React.useRef<string | null>(null);
  const saveNoticeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedParams = useMemo(() => {
    const getValue = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] : value;

    return {
      openProtocolModal: getValue(params.openProtocolModal),
      protocolTitle: getValue(params.protocolTitle),
      protocolDescription: getValue(params.protocolDescription),
      protocolExecutionId: getValue(params.protocolExecutionId),
      notificationId: getValue(params.notificationId),
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
      if (USE_MOCK_TIMELINE) {
        setResponses(MOCK_TIMELINE);
        return;
      }

      const currentDeviceId = await getStoredDeviceIdAsync();
      const all = await ProtocolsApi.recentResponses(24, {
        userId: MONITOR_USER_ID,
        role: MONITOR_ROLE,
        deviceId: currentDeviceId,
      });
      const normalized = Array.isArray(all) ? all : [];
      if (normalized.length === 0 && __DEV__) {
        setResponses(MOCK_TIMELINE);
      } else {
        setResponses(normalized);
      }
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
      if (USE_MOCK_TIMELINE) {
        setMonitors(MOCK_MONITORS);
        return;
      }

      const data = await ApiService.getMonitors();
      const normalized = Array.isArray(data) ? data : [];
      if (normalized.length === 0 && __DEV__) {
        setMonitors(MOCK_MONITORS);
      } else {
        setMonitors(normalized);
      }
    } catch (error) {
      recordDiagnostic({
        source: "protocols.loadMonitors",
        message: "No se pudieron cargar los monitores.",
        error,
      });
    }
  }, []);

  const openExecutionProtocol = useCallback((item: ProtocolExecutionResponse) => {
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
    });
    setReminderVisible(true);
  }, [reminderVisible]);

  const openExecutionDetails = useCallback((item: ProtocolExecutionResponse) => {
    setSelectedExecution(item);
    setDetailVisible(true);
  }, []);

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
    });
    setReminderVisible(true);
  }, [normalizedParams]);

  const handleReminderSave = useCallback(
    async (answer: "sí" | "no", note: string, respondedBy: string) => {
      if (!reminderProtocol) {
        closeReminder();
        return;
      }

      const executionId = Number(reminderProtocol.id);
      if (Number.isNaN(executionId)) {
        closeReminder();
        return;
      }

      try {
        if (!USE_MOCK_TIMELINE) {
          const deviceId = await getStoredDeviceIdAsync();
          await ProtocolsApi.respond(
            executionId,
            {
              responseValue: answer === "sí" ? "YES" : "NO",
              responseNote: note,
              responderName: respondedBy,
              deviceId: deviceId ?? undefined,
            },
            { userId: MONITOR_USER_ID, role: MONITOR_ROLE },
          );
        }

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
                respondedAt: now,
              }
            : current,
        );
        showSaveNotice("Respuesta guardada y sincronizada con el backend.");
        closeReminder();
      } catch (error) {
        recordDiagnostic({
          source: "protocols.modalSave",
          message: "No se pudo guardar la respuesta del modal.",
          error,
        });
      }
    },
    [closeReminder, loadResponses, reminderProtocol, showSaveNotice],
  );

  const timelineProtocols = useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase();
    return [...responses]
      .sort((a, b) => {
        const aTime = new Date(a.scheduledFor || a.lastReminderAt || 0).getTime();
        const bTime = new Date(b.scheduledFor || b.lastReminderAt || 0).getTime();
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

  const selectedDetailMeta = selectedExecution
    ? getStatusMeta(selectedExecution.status)
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

  const nextProtocol = useMemo(() => {
    const nowTime = currentMoment.getTime();
    const next = timelineProtocols.find((item) => {
      const itemTime = new Date(item.scheduledFor || item.lastReminderAt || 0).getTime();
      return itemTime >= nowTime && item.status !== "ANSWERED";
    });

    return next || timelineProtocols.find((item) => item.status !== "ANSWERED") || null;
  }, [currentMoment, timelineProtocols]);

  const openReminderFromDetail = useCallback(() => {
    if (!selectedExecution) return;
    openExecutionProtocol(selectedExecution);
    closeExecutionDetails();
  }, [closeExecutionDetails, openExecutionProtocol, selectedExecution]);

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
        visible={detailVisible && Boolean(selectedExecution)}
        transparent
        animationType="fade"
        onRequestClose={closeExecutionDetails}
      >
        <View className="flex-1 bg-black/55 justify-center px-4">
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeExecutionDetails}
            className="absolute inset-0"
          />
          {selectedExecution ? (
            <View className="rounded-[28px] bg-white p-5 shadow-2xl border border-[#E2E8F0]">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 pr-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#64748B]">
                    Detalle del protocolo
                  </Text>
                  <Text className="mt-2 text-[22px] font-bold leading-7 text-[#0F172A]">
                    {selectedExecution.protocolTitle || "Protocolo"}
                  </Text>
                  <Text className="mt-1 text-sm text-[#475569]">
                    Hora programada: {getTimeLabel(selectedExecution.scheduledFor)}
                  </Text>
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
                  <Text className="text-xs font-semibold" style={{ color: selectedDetailMeta.color }}>
                    {selectedDetailMeta.label}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                  Resumen
                </Text>
                <Text className="mt-2 text-sm leading-6 text-[#334155]">
                  {selectedExecution.content || "Sin descripción registrada."}
                </Text>
              </View>

              <View className="mt-4 rounded-3xl border border-[#E2E8F0] bg-white px-4 py-4">
                <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                  Respuesta
                </Text>
                {selectedExecution.status === "ANSWERED" ? (
                  <View className="mt-2">
                    <Text className="text-sm font-semibold text-[#0F172A]">
                      {selectedExecution.respondedByName || "Sin nombre"}
                    </Text>
                    <Text className="mt-1 text-sm leading-6 text-[#334155]">
                      {selectedExecution.responseNote || "Respuesta registrada sin detalle adicional."}
                    </Text>
                    <Text className="mt-2 text-xs text-[#64748B]">
                      Respondido: {formatDateTime(selectedExecution.respondedAt)}
                    </Text>
                  </View>
                ) : (
                  <Text className="mt-2 text-sm leading-6 text-[#334155]">
                    Todavía no se ha guardado una respuesta para este protocolo.
                  </Text>
                )}
              </View>

              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  onPress={closeExecutionDetails}
                  className="flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
                >
                  <Text className="text-center font-semibold text-[#475569]">
                    Cerrar
                  </Text>
                </TouchableOpacity>
                {selectedExecution.status !== "ANSWERED" ? (
                  <TouchableOpacity
                    onPress={openReminderFromDetail}
                    className="flex-1 rounded-2xl bg-[#006bb3] px-4 py-3"
                  >
                    <Text className="text-center font-semibold text-white">
                      Completar protocolo
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <FlatList
        data={timelineProtocols}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TimelineRow item={item} onPress={openExecutionDetails} />
        )}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
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
                    {currentClockLabel}. Toca un evento para ver qué falta, qué ya se hizo y quién respondió.
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
                      {timelineProtocols.length} eventos
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <Text className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]">
                    Siguiente tarea
                  </Text>
                  <Text className="mt-1 text-base font-bold text-[#0F172A]" numberOfLines={1}>
                    {nextProtocol?.protocolTitle || "Todo al día"}
                  </Text>
                  <Text className="mt-1 text-sm text-[#475569]" numberOfLines={1}>
                    {nextProtocol ? `${getTimeLabel(nextProtocol.scheduledFor)} · ${getStatusMeta(nextProtocol.status).label}` : "No hay protocolos pendientes visibles"}
                  </Text>
                </View>
                <View className="w-[88px] rounded-3xl border border-[#E2E8F0] bg-[#FEF3C7] px-3 py-3 items-center justify-center">
                  <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#B78607" />
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
              <Text className="mt-3 text-[#475569]">Cargando protocolos...</Text>
            </View>
          ) : (
            <View className="min-h-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-sm border border-[#E2E8F0]">
              <MaterialCommunityIcons
                name="timeline-text-outline"
                size={40}
                color="#1D4ED8"
              />
              <Text className="mt-4 text-center text-[#475569] text-sm">
                No hay protocolos para mostrar con el filtro actual.
              </Text>
            </View>
          )
        }
        ListFooterComponent={<AppVersionFooter />}
      />
    </View>
  );

}
