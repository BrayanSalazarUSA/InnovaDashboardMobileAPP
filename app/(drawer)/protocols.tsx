import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiService } from "@/services/api";
import { ProtocolsApi, ProtocolExecutionResponse } from "@/services/protocols";
import "../../global.css";
import AppVersionFooter from "../_components/AppVersionFooter";
import ProtocolReminderModal from "../components/ui/ProtocolReminderModal";
import { recordDiagnostic } from "../../utils/diagnostics";
import { getStoredDeviceIdAsync } from "../../utils/deviceIdentity";
import { MONITOR_ROLE, MONITOR_USER_ID } from "../../utils/monitorIdentity";

const STATUS_STYLES: Record<
  string,
  { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  PENDING: {
    label: "Pendiente",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "clock-outline",
  },
  ANSWERED: {
    label: "Respondido",
    color: "#166534",
    bg: "#DCFCE7",
    icon: "check-circle-outline",
  },
  IGNORED: {
    label: "Ignorado",
    color: "#475569",
    bg: "#E2E8F0",
    icon: "close-circle-outline",
  },
};

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const lastOpenedNotificationRef = React.useRef<string | null>(null);
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

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const all = await ProtocolsApi.recentResponses(24, {
        userId: MONITOR_USER_ID,
        role: MONITOR_ROLE,
      });
      setResponses(Array.isArray(all) ? all : []);
    } catch (error) {
      recordDiagnostic({
        source: "protocols.loadResponses",
        message: "No se pudieron cargar las respuestas de protocolos.",
        error,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await ApiService.getMonitors();
      setMonitors(Array.isArray(data) ? data : []);
    } catch (error) {
      recordDiagnostic({
        source: "protocols.loadMonitors",
        message: "No se pudieron cargar los monitores.",
        error,
      });
    }
  }, []);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

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
        await loadResponses();
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

  const filteredResponses = useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase();
    return responses
      .filter((item) => item.status === "ANSWERED")
      .filter((item) => {
        if (!lowerSearch) {
          return true;
        }

        return [item.protocolTitle, item.responseNote, item.respondedByName, item.responseValue]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(lowerSearch));
      })
      .sort((a, b) => {
        const aTime = new Date(a.respondedAt || a.scheduledFor || 0).getTime();
        const bTime = new Date(b.respondedAt || b.scheduledFor || 0).getTime();
        return bTime - aTime;
      });
  }, [responses, searchQuery]);

  const summary = useMemo(() => {
    const pending = responses.filter((item) => item.status === "PENDING").length;
    const answered = responses.filter((item) => item.status === "ANSWERED").length;

    return { total: answered, pending };
  }, [responses]);

  return (
    <ScrollView
      className="flex-1 bg-[#F5F8FB] p-4"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {reminderProtocol ? (
        <ProtocolReminderModal
          visible={reminderVisible}
          protocol={reminderProtocol}
          monitors={monitors}
          onClose={closeReminder}
          onSave={handleReminderSave}
        />
      ) : null}

      <View className="mb-4 rounded-[28px] bg-white px-5 py-4 shadow-sm border border-[#E2E8F0]">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[26px] font-bold leading-8 text-[#0F172A]">
              Seguimiento de Protocolos
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#475569]">
              Abre un recordatorio y revisa las respuestas recientes de las ultimas 24 horas.
            </Text>
          </View>

          <View className="items-end">
            <View className="rounded-2xl bg-[#EFF6FF] px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
                {summary.pending} pendientes
              </Text>
            </View>
            <Text className="mt-2 text-xs text-[#94A3B8]">
              {summary.total} registros
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
          placeholder="Buscar protocolo, persona o nota"
          placeholderTextColor="#94A3B8"
          className="flex-1 text-sm text-[#0F172A] ml-3"
        />
        <TouchableOpacity onPress={loadResponses} className="rounded-full bg-[#EFF6FF] p-2">
          <Ionicons name="refresh" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="min-h-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-sm border border-[#E2E8F0]">
          <ActivityIndicator size="large" color="#C9A13B" />
          <Text className="mt-3 text-[#475569]">Cargando respuestas...</Text>
        </View>
      ) : filteredResponses.length === 0 ? (
        <View className="min-h-[240px] items-center justify-center rounded-3xl bg-white p-6 shadow-sm border border-[#E2E8F0]">
          <MaterialCommunityIcons
            name="clipboard-text-multiple-outline"
            size={40}
            color="#1D4ED8"
          />
          <Text className="mt-4 text-center text-[#475569] text-sm">
            No se encontraron respuestas en las últimas 24 horas con los filtros actuales.
          </Text>
        </View>
      ) : (
        <View>
          <View className="mb-3 flex-row items-center justify-between px-1">
            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Ultimas respuestas
            </Text>
            <Text className="text-xs text-[#94A3B8]">
              Mas recientes arriba
            </Text>
          </View>
          {filteredResponses.map((item) => {
            const statusMeta = STATUS_STYLES[item.status] || STATUS_STYLES.PENDING;
            const timestamp = item.respondedAt || item.scheduledFor;

            return (
              <View
                key={item.id}
                className="mb-4 rounded-[28px] bg-white border border-[#E2E8F0] p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-bold text-[#111827] mb-1">
                      {item.protocolTitle || "Protocolo"}
                    </Text>
                    <Text className="text-xs text-[#64748B]">
                      Programado: {formatDateTime(item.scheduledFor)}
                    </Text>
                    <Text className="text-xs text-[#64748B]">
                      Respondido: {formatDateTime(item.respondedAt)}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-3 py-2 flex-row items-center gap-2"
                    style={{ backgroundColor: statusMeta.bg }}
                  >
                    <MaterialCommunityIcons
                      name={statusMeta.icon}
                      size={16}
                      color={statusMeta.color}
                    />
                    <Text className="text-sm font-semibold" style={{ color: statusMeta.color }}>
                      {statusMeta.label}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-12 h-12 rounded-full bg-[#DBEAFE] items-center justify-center border border-[#BFDBFE]">
                    <Text className="text-sm font-bold text-[#1D4ED8]">
                      {(item.respondedByName || "S").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs uppercase tracking-[0.18em] text-[#64748B]">
                      Respondió
                    </Text>
                    <Text className="text-base font-semibold text-[#0F172A]">
                      {item.respondedByName || "Pendiente"}
                    </Text>
                  </View>
                </View>

                <Text className="text-sm text-[#475569] leading-6 mb-4">
                  {item.responseNote || item.content || "Sin comentarios adicionales registrados."}
                </Text>

                <View className="flex-row items-center justify-between pt-3 border-t border-[#E5E7EB]">
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons
                      name="clock-time-four-outline"
                      size={16}
                      color="#64748B"
                    />
                    <Text className="text-xs text-[#64748B]">
                      {formatDateTime(timestamp)}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={16}
                      color="#0F172A"
                    />
                    <Text className="text-xs text-[#0F172A] font-medium">
                      Registro en backend
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <AppVersionFooter />
    </ScrollView>
  );
}
