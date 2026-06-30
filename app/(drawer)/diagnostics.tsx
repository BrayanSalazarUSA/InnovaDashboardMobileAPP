import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getStoredDeviceIdAsync,
  getStoredDeviceNameAsync,
} from "../../utils/deviceIdentity";

import {
  clearDiagnosticEntries,
  DiagnosticEntry,
  getAppVersionLabel,
  getDiagnosticEntries,
} from "../../utils/diagnostics";
import { resolveApiBaseUrl } from "../../utils/apiBaseUrl";
import { getStoredExpoPushTokenAsync } from "../../utils/pushNotifications";
import AppVersionFooter from "../_components/AppVersionFooter";

const API_URL = resolveApiBaseUrl();

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLevelPalette(level: DiagnosticEntry["level"]) {
  switch (level) {
    case "error":
    default:
      return {
        bg: "#FEF2F2",
        border: "#FECACA",
        text: "#B91C1C",
        label: "Error",
      };
  }
}

export default function DiagnosticsScreen() {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const [nextEntries, storedToken, storedDeviceId, storedDeviceName] =
        await Promise.all([
          getDiagnosticEntries(),
          getStoredExpoPushTokenAsync(),
          getStoredDeviceIdAsync(),
          getStoredDeviceNameAsync(),
        ]);

      setEntries(nextEntries);
      setPushToken(storedToken);
      setDeviceId(storedDeviceId);
      setDeviceName(storedDeviceName);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadEntries();
    }, [loadEntries]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadEntries();
  }, [loadEntries]);

  const handleClear = useCallback(() => {
    Alert.alert(
      "Limpiar diagnostico",
      "Se borraran los errores guardados en este celular.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await clearDiagnosticEntries();
            setEntries([]);
          },
        },
      ],
    );
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-[#F9F7F1]"
      contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="rounded-[28px] border border-[#E7DFC4] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-semibold text-[#111827]">
              Diagnostico de la app
            </Text>
            <Text className="mt-2 text-[#6B7280] leading-5">
              Aqui ves solo los errores guardados en este celular para revisar
              en que version ocurrieron y desde que modulo salieron.
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1C7]">
            <Ionicons name="bug-outline" size={24} color="#A67C00" />
          </View>
        </View>
      </View>
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleRefresh}
          className="flex-1 flex-row items-center justify-center rounded-[20px] border border-[#D7DCE5] bg-white py-4"
        >
          <Ionicons name="refresh-outline" size={18} color="#475569" />
          <Text className="ml-2 font-semibold text-[#475569]">Actualizar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleClear}
          className="flex-1 flex-row items-center justify-center rounded-[20px] border border-[#F3C7C7] bg-[#FFF4F4] py-4"
        >
          <Ionicons name="trash-outline" size={18} color="#B42318" />
          <Text className="ml-2 font-semibold text-[#B42318]">Limpiar</Text>
        </TouchableOpacity>
      </View>
      <View className="mt-5 rounded-[28px] border border-[#E7DFC4] bg-white p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-[#111827]">
            Errores recientes
          </Text>
          <Text className="text-sm text-[#8A7355]">
            {entries.length} guardados
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#C9A13B" style={{ marginVertical: 20 }} />
        ) : entries.length === 0 ? (
          <View className="rounded-[22px] border border-dashed border-[#D7D0BA] bg-[#FFFCF5] px-4 py-8">
            <Text className="text-center text-[#7A7464]">
              Todavia no hay errores guardados en este dispositivo.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const palette = getLevelPalette(entry.level);

            return (
              <View
                key={entry.id}
                className="mb-3 rounded-[22px] border p-4"
                style={{
                  borderColor: palette.border,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: palette.bg }}
                  >
                    <Text
                      style={{ color: palette.text }}
                      className="font-semibold"
                    >
                      {palette.label}
                    </Text>
                  </View>
                  <Text className="text-xs text-[#8A7355]">
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                </View>

                <Text className="mt-3 text-base font-semibold text-[#111827]">
                  {entry.message}
                </Text>
                <Text className="mt-2 text-sm text-[#5B6472]">
                  Fuente: {entry.source}
                </Text>
                <Text className="mt-1 text-sm text-[#5B6472]">
                  Version: {entry.appVersion} • {entry.platform}
                </Text>

                {entry.extra ? (
                  <Text className="mt-3 text-sm leading-5 text-[#475569]">
                    {entry.extra}
                  </Text>
                ) : null}

                {entry.stack ? (
                  <View className="mt-3 rounded-[18px] bg-[#F8FAFC] p-3">
                    <Text className="text-xs leading-5 text-[#64748B]">
                      {entry.stack}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
      <View className="mt-5 rounded-[28px] border border-[#D8E4F3] bg-white p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-[#111827]">
            Estado tecnico
          </Text>
          <Text className="text-sm text-[#64748B]">
            Para validar pushes y backend
          </Text>
        </View>
        <View className="space-y-3">
          <View className="rounded-[20px] bg-[#F8FAFC] px-4 py-3 border border-[#E2E8F0]">
            <Text className="text-xs uppercase tracking-[0.16em] text-[#64748B]">
              Version actual
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#0F172A]">
              {getAppVersionLabel()}
            </Text>
          </View>

          <View className="rounded-[20px] bg-[#F8FAFC] px-4 py-3 border border-[#E2E8F0]">
            <Text className="text-xs uppercase tracking-[0.16em] text-[#64748B]">
              Backend activo
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#0F172A]">
              {API_URL}
            </Text>
          </View>
          <View className="rounded-[20px] bg-[#F8FAFC] px-4 py-3 border border-[#E2E8F0]">
            <Text className="text-xs uppercase tracking-[0.16em] text-[#64748B]">
              Token guardado en el celular
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#0F172A]">
              {pushToken || "No registrado todavia"}
            </Text>
          </View>
          <View className="rounded-[20px] bg-[#F8FAFC] px-4 py-3 border border-[#E2E8F0]">
            <Text className="text-xs uppercase tracking-[0.16em] text-[#64748B]">
              Nombre del dispositivo
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#0F172A]">
              {deviceName || "Pendiente de configurar"}
            </Text>
            <Text className="mt-1 text-[11px] text-[#94A3B8]">
              {deviceId || "Sin identificador local"}
            </Text>
          </View>
        </View>
      </View>
      <AppVersionFooter />
    </ScrollView>
  );
}
