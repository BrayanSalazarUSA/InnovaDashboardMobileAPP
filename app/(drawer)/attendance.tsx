import { AttendanceApi } from "@/services/attendance";
import {
  AttendanceDashboard,
  AttendanceEmployee,
  AttendanceLookupResponse,
  AttendanceSessionSummary,
  AttendanceTeamRow,
} from "@/types/attendance";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppVersionFooter from "../_components/AppVersionFooter";
import { recordDiagnostic } from "../_lib/diagnostics";
import "../../global.css";

const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET || "";
const SELFIE_REQUIRED = Platform.OS !== "web";
const BREAK_ACTION_ENABLED = false;

const SESSION_STATUS_META: Record<
  AttendanceSessionSummary["status"],
  {
    label: string;
    bg: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  ACTIVE: {
    label: "Turno activo",
    bg: "#DCFCE7",
    text: "#166534",
    icon: "play-circle-outline",
  },
  ON_BREAK: {
    label: "En descanso",
    bg: "#FEF3C7",
    text: "#92400E",
    icon: "cafe-outline",
  },
  COMPLETED: {
    label: "Finalizado",
    bg: "#DBEAFE",
    text: "#1D4ED8",
    icon: "checkmark-circle-outline",
  },
};

const TEAM_STATUS_META: Record<
  AttendanceTeamRow["status"],
  {
    bg: string;
    text: string;
    dot: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  Trabajando: {
    bg: "#DCFCE7",
    text: "#166534",
    dot: "#22C55E",
    icon: "radio-outline",
  },
  "En descanso": {
    bg: "#FEF3C7",
    text: "#92400E",
    dot: "#F59E0B",
    icon: "cafe-outline",
  },
  Finalizado: {
    bg: "#E2E8F0",
    text: "#475569",
    dot: "#94A3B8",
    icon: "checkmark-done-outline",
  },
  Pendiente: {
    bg: "#F3F4F6",
    text: "#4B5563",
    dot: "#9CA3AF",
    icon: "time-outline",
  },
  "No fichado": {
    bg: "#FEE2E2",
    text: "#991B1B",
    dot: "#EF4444",
    icon: "alert-circle-outline",
  },
  Descanso: {
    bg: "#EDE9FE",
    text: "#6D28D9",
    dot: "#8B5CF6",
    icon: "bed-outline",
  },
  "Sin turno": {
    bg: "#F3F4F6",
    text: "#4B5563",
    dot: "#D1D5DB",
    icon: "remove-circle-outline",
  },
};

type TeamFilter = "ACTIVE" | "BREAK" | "ALL";

type SuccessModalState = {
  title: string;
  message: string;
};

type SecurityPromptState = {
  visible: boolean;
  employeeName: string;
  actionLabel: string;
  value: string;
  error: string;
};

const EMPTY_SECURITY_PROMPT: SecurityPromptState = {
  visible: false,
  employeeName: "",
  actionLabel: "",
  value: "",
  error: "",
};

type QuickActionMeta = {
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  border: string;
  gradient: readonly [string, string];
};

function formatMinutes(minutes: number) {
  if (!minutes) return "0m";
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function resolveImageUri(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BUCKET_URL}${path}`;
}

function getEmployeeHelperText(employee: AttendanceEmployee) {
  if (employee.requiresSecurityCode) {
    return "Administrador protegido. Se pedira PIN para registrar acciones.";
  }

  if (employee.roleName) {
    return `${employee.roleName}. Toca para abrir la ficha y ver la accion principal.`;
  }

  return "Toca para abrir la ficha y ver la accion principal.";
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="flex-1 min-w-[46%] overflow-hidden rounded-[24px] border border-[#E7DFC4] bg-white">
      <LinearGradient
        colors={["#FFFFFF", "#FFF9E8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[#6A5F3B] text-xs uppercase tracking-wide font-semibold">
            {label}
          </Text>
          <View className="w-9 h-9 rounded-2xl bg-[#FFF1C7] items-center justify-center">
            <Ionicons name={icon} size={18} color="#A67C00" />
          </View>
        </View>
        <Text className="text-2xl font-semibold text-[#151515] mt-3">
          {value}
        </Text>
        <Text className="text-[#8B7355] text-xs mt-1">
          Resumen en tiempo real
        </Text>
      </LinearGradient>
    </View>
  );
}

function TeamFilterChip({
  label,
  count,
  dotColor,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  dotColor: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-full border px-4 py-2.5 flex-row items-center"
      style={{
        backgroundColor: selected ? "#2F2A22" : "#FFFFFF",
        borderColor: selected ? "#2F2A22" : "#E7DFC4",
      }}
    >
      <View
        className="w-2.5 h-2.5 rounded-full mr-2"
        style={{ backgroundColor: selected ? "#FFFFFF" : dotColor }}
      />
      <Text
        className="font-semibold"
        style={{ color: selected ? "#FFFDF8" : "#3B352C" }}
      >
        {label}
      </Text>
      <View
        className="ml-2 rounded-full px-2 py-0.5"
        style={{
          backgroundColor: selected ? "rgba(255,255,255,0.18)" : "#F4EED9",
        }}
      >
        <Text
          className="text-xs font-semibold"
          style={{ color: selected ? "#FFFDF8" : "#8A6414" }}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function InfoPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const palette = {
    default: {
      bg: "#FFFDF8",
      border: "#E9DFC2",
      label: "#8A6E28",
      value: "#1F2937",
    },
    success: {
      bg: "#F0F9F1",
      border: "#CFE8D2",
      label: "#2F6B3B",
      value: "#1E4D2B",
    },
    warning: {
      bg: "#FFF8EA",
      border: "#EED7A0",
      label: "#8A6414",
      value: "#6E4F0C",
    },
    danger: {
      bg: "#FEF2F2",
      border: "#F6D0D0",
      label: "#B42318",
      value: "#912018",
    },
  }[tone];

  return (
    <View
      className="flex-1 min-w-[47%] rounded-2xl px-3 py-3 border"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <Text
        className="text-[11px] uppercase font-semibold"
        style={{ color: palette.label }}
      >
        {label}
      </Text>
      <Text
        className="font-semibold mt-1"
        style={{ color: palette.value, fontSize: 15 }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  tone = "success",
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "success" | "warning" | "secondary" | "soft";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const palette = {
    success: {
      bg: "#22C55E",
      border: "#16A34A",
      text: "#F7FFF9",
      icon: "#F7FFF9",
      disabledBg: "#A7D9B9",
      disabledBorder: "#A7D9B9",
      disabledText: "#F7FFF9",
    },
    warning: {
      bg: "#F59E0B",
      border: "#D97706",
      text: "#FFFDF8",
      icon: "#FFFDF8",
      disabledBg: "#E6C48D",
      disabledBorder: "#E6C48D",
      disabledText: "#FFFDF8",
    },
    secondary: {
      bg: "#2F2A22",
      border: "#2F2A22",
      text: "#FFFDF8",
      icon: "#FFFDF8",
      disabledBg: "#BDB6AA",
      disabledBorder: "#BDB6AA",
      disabledText: "#FFFDF8",
    },
    soft: {
      bg: "#FFF8E6",
      border: "#D9C58E",
      text: "#7A5C00",
      icon: "#7A5C00",
      disabledBg: "#EEE6D2",
      disabledBorder: "#E1D7BD",
      disabledText: "#9E9276",
    },
  }[tone];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      className="rounded-[20px] py-4 px-4 border items-center justify-center flex-row"
      style={{
        backgroundColor: disabled ? palette.disabledBg : palette.bg,
        borderColor: disabled ? palette.disabledBorder : palette.border,
        shadowColor: disabled ? "transparent" : palette.border,
        shadowOpacity: disabled ? 0 : 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: disabled ? 0 : 3,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? palette.disabledText : palette.icon}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text
        className="font-semibold text-base"
        style={{ color: disabled ? palette.disabledText : palette.text }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SuccessFeedbackModal({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center px-6"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.35)" }}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.92, translateY: 18 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280 }}
        >
          <View className="overflow-hidden rounded-[32px] border border-[#E8D39B] bg-white">
            <LinearGradient
              colors={["#FFF9E8", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              <View className="items-center">
                <View
                  className="w-full items-center justify-center"
                  style={{ height: 150 }}
                >
                  <MotiView
                    from={{ scale: 0.8, opacity: 0.25 }}
                    animate={{ scale: 1.35, opacity: 0 }}
                    transition={{
                      type: "timing",
                      duration: 1700,
                      loop: true,
                      repeatReverse: false,
                    }}
                    className="absolute w-28 h-28 rounded-full bg-[#86EFAC]"
                  />
                  <MotiView
                    from={{ scale: 0.88, rotate: "-10deg" }}
                    animate={{ scale: 1, rotate: "0deg" }}
                    transition={{ type: "spring", damping: 12, mass: 0.8 }}
                  >
                    <LinearGradient
                      colors={["#22C55E", "#16A34A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 32,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#16A34A",
                        shadowOpacity: 0.28,
                        shadowRadius: 18,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 8,
                      }}
                    >
                      <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                    </LinearGradient>
                  </MotiView>
                </View>

                <Text className="text-[28px] leading-[32px] font-semibold text-[#111827] text-center">
                  {title}
                </Text>
                <Text className="text-[#5B6472] text-base text-center mt-3 leading-6">
                  {message}
                </Text>

                <View className="mt-4 rounded-full bg-[#ECFDF5] px-4 py-2 flex-row items-center">
                  <Ionicons name="sparkles-outline" size={16} color="#166534" />
                  <Text className="text-[#166534] font-medium ml-2">
                    Registro confirmado
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                className="mt-6"
              >
                <LinearGradient
                  colors={["#22C55E", "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 22,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text className="text-white font-semibold text-base ml-2">
                      Perfecto
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

function SecurityCodeModal({
  visible,
  employeeName,
  actionLabel,
  value,
  error,
  onChangeText,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  employeeName: string;
  actionLabel: string;
  value: string;
  error?: string;
  onChangeText: (nextValue: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View
        className="flex-1 justify-center px-6"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.38)" }}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.96, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 220 }}
        >
          <View className="overflow-hidden rounded-[28px] border border-[#D9DDE7] bg-white">
            <LinearGradient
              colors={["#F8FAFF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22 }}
            >
              <View className="w-14 h-14 rounded-[20px] bg-[#EEF2FF] items-center justify-center">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={28}
                  color="#3657B4"
                />
              </View>

              <Text className="text-[#111827] text-[24px] leading-[28px] font-semibold mt-4">
                Codigo de seguridad
              </Text>
              <Text className="text-[#5B6472] mt-2 leading-6">
                Ingresa el PIN de {employeeName} para {actionLabel}.
              </Text>

              <View className="mt-5 rounded-[22px] border border-[#D8DCE6] bg-[#F8FAFC] px-4 py-3">
                <Text className="text-[#64748B] text-xs uppercase tracking-wide font-semibold">
                  PIN administrador
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChangeText}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="Ingresa el PIN"
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  className="text-[#0F172A] text-xl font-semibold mt-2"
                  onSubmitEditing={onSubmit}
                />
              </View>

              {error ? (
                <Text className="text-[#B91C1C] text-sm mt-3">{error}</Text>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.9}
                  className="flex-1 rounded-[20px] border border-[#D7DCE5] items-center justify-center py-4 bg-white"
                >
                  <Text className="text-[#475569] font-semibold text-base">
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSubmit}
                  activeOpacity={0.9}
                  className="flex-1 overflow-hidden rounded-[20px]"
                >
                  <LinearGradient
                    colors={["#3657B4", "#1F6FAE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                      <Text className="text-white font-semibold text-base ml-2">
                        Validar PIN
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

function SelfieCaptureCard({
  selfieUri,
  onCapture,
  onClear,
  disabled,
}: {
  selfieUri: string | null;
  onCapture: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  if (selfieUri) {
    return (
      <View className="mt-4 overflow-hidden rounded-[24px] border border-[#E7DFC4] bg-white">
        <LinearGradient
          colors={["#FFF8E8", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 16 }}
        >
          <View className="relative">
            <Image
              source={{ uri: selfieUri }}
              className="w-full h-44 rounded-[20px]"
            />
            <TouchableOpacity
              onPress={onClear}
              disabled={disabled}
              className="absolute top-3 right-3 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(47, 42, 34, 0.82)" }}
            >
              <Ionicons name="close" size={18} color="#FFFDF8" />
            </TouchableOpacity>
          </View>

          <View className="pt-4">
            <Text className="text-[#151515] font-semibold text-base">
              Selfie lista para registrar
            </Text>
            <Text className="text-[#6B7280] text-sm mt-1 leading-5">
              Si quieres cambiarla, eliminela con la X. Cuando este bien, toca
              la accion principal.
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onCapture}
      disabled={disabled}
      activeOpacity={0.9}
      className="mt-4 overflow-hidden rounded-[24px] border border-dashed border-[#C9A13B] bg-white"
    >
      <LinearGradient
        colors={["#FFF9E8", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20, alignItems: "center" }}
      >
        <View className="w-16 h-16 rounded-[22px] bg-[#FFF1C7] items-center justify-center">
          <MaterialCommunityIcons
            name="face-recognition"
            size={34}
            color="#A67C00"
          />
        </View>
        <Text className="text-[#7A5C00] font-semibold mt-3 text-base">
          Tomar selfie del registro
        </Text>
        <Text className="text-[#8B7355] text-sm mt-2 text-center leading-5">
          La selfie queda registrada tanto para el ingreso como para la salida.
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function EmployeeOptionCard({
  employee,
  selected,
  onPress,
}: {
  employee: AttendanceEmployee;
  selected: boolean;
  onPress: () => void;
}) {
  const avatarUri = resolveImageUri(employee.image);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      className={`px-4 py-3.5 ${selected ? "bg-[#FFF7E0]" : "bg-white"}`}
    >
      <View className="flex-row items-center">
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            className="w-11 h-11 rounded-full mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="w-11 h-11 rounded-full bg-[#E8D9A7] mr-3 items-center justify-center">
            <Text className="text-[#7A5C00] font-semibold text-base">
              {employee.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-[#161616] font-semibold text-[15px]">
            {employee.name}
          </Text>
          <Text className="text-[#8B7355] text-sm mt-1">
            {getEmployeeHelperText(employee)}
          </Text>
        </View>

        {selected ? (
          <View className="px-3 py-1 rounded-full bg-[#E8F5E9]">
            <Text className="text-[#2E7D32] text-xs font-semibold">
              Seleccionado
            </Text>
          </View>
        ) : employee.requiresSecurityCode ? (
          <View className="px-3 py-1 rounded-full bg-[#EEF2FF]">
            <Text className="text-[#3657B4] text-[11px] font-semibold">
              PIN
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward-outline" size={18} color="#A67C00" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function TeamRowCard({
  row,
  onPress,
}: {
  row: AttendanceTeamRow;
  onPress: () => void;
}) {
  const meta = TEAM_STATUS_META[row.status];
  const avatarUri = resolveImageUri(row.employeeImage);
  const primaryTimeLabel =
    row.status === "Finalizado"
      ? "Salida"
      : row.clockInAt
        ? "Entrada"
        : row.scheduledStart
          ? "Turno"
          : "Estado";
  const primaryTimeValue =
    row.status === "Finalizado"
      ? formatTime(row.clockOutAt)
      : row.clockInAt
        ? formatTime(row.clockInAt)
        : row.scheduledStart
          ? formatTime(row.scheduledStart)
          : "--:--";
  const secondaryChip =
    row.status === "En descanso"
      ? `Descanso ${formatMinutes(row.breakMinutes)}`
      : row.workedMinutes > 0
        ? `Acumulado ${formatMinutes(row.workedMinutes)}`
        : row.shiftLabel || "Sin turno";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      className="bg-white border border-[#E7DFC4] rounded-[24px] px-4 py-4 mb-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row flex-1 items-center pr-3">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-12 h-12 rounded-full mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-[#E8D9A7] mr-3 items-center justify-center">
              <Text className="text-[#7A5C00] font-semibold text-lg">
                {row.employeeName?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: meta.dot }}
              />
              <Text className="text-[#161616] font-semibold text-base flex-1">
                {row.employeeName}
              </Text>
            </View>
            <Text numberOfLines={1} className="text-[#8A6E28] text-sm mt-1">
              {row.shiftLabel || "Sin turno programado"}
            </Text>
            <View className="flex-row flex-wrap mt-2 gap-2">
              <View className="bg-[#F9F7F1] rounded-full px-3 py-1.5">
                <Text className="text-[#5B6472] text-xs font-semibold">
                  {primaryTimeLabel}: {primaryTimeValue}
                </Text>
              </View>
              <View className="bg-[#F5F3FF] rounded-full px-3 py-1.5">
                <Text className="text-[#5B21B6] text-xs font-semibold">
                  {secondaryChip}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="items-end">
          <View
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: meta.bg }}
          >
            <Ionicons name={meta.icon} size={14} color={meta.text} />
            <Text
              className="text-xs"
              style={{ color: meta.text, marginLeft: 6, fontWeight: "600" }}
            >
              {row.status}
            </Text>
          </View>
          <Text className="text-[#6B7280] text-xs mt-2">
            {row.status === "Finalizado"
              ? `Salio ${formatTime(row.clockOutAt)}`
              : row.clockInAt
                ? `Entro ${formatTime(row.clockInAt)}`
                : "Sin marca"}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap mt-3 gap-2">
        {row.lateMinutes > 0 && (
          <View className="bg-[#FFF1F2] rounded-full px-3 py-1">
            <Text className="text-[#BE123C] text-xs font-medium">
              Llegada tarde: {formatMinutes(row.lateMinutes)}
            </Text>
          </View>
        )}
        {row.earlyLeaveMinutes > 0 && (
          <View className="bg-[#FFF7ED] rounded-full px-3 py-1">
            <Text className="text-[#C2410C] text-xs font-medium">
              Salida temprana: {formatMinutes(row.earlyLeaveMinutes)}
            </Text>
          </View>
        )}
        {row.overtimeMinutes > 0 && (
          <View className="bg-[#ECFDF5] rounded-full px-3 py-1">
            <Text className="text-[#047857] text-xs font-medium">
              Tiempo extra detectado: {formatMinutes(row.overtimeMinutes)}
            </Text>
          </View>
        )}
        {row.offDay && (
          <View className="bg-[#F5F3FF] rounded-full px-3 py-1">
            <Text className="text-[#6D28D9] text-xs font-medium">
              Descanso programado
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AttendanceScreen() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const securityPromptResolverRef = useRef<((value: string | null) => void) | null>(
    null,
  );
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<AttendanceEmployee | null>(null);
  const [lookup, setLookup] = useState<AttendanceLookupResponse | null>(null);
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("ACTIVE");
  const [successModal, setSuccessModal] = useState<SuccessModalState | null>(
    null,
  );
  const [securityPrompt, setSecurityPrompt] = useState<SecurityPromptState>(
    EMPTY_SECURITY_PROMPT,
  );

  const currentSession = lookup?.currentSession ?? null;
  const currentEmployee = selectedEmployee ?? lookup?.employee ?? null;
  const hasSearchQuery = employeeQuery.trim().length > 0;
  const showSearchResults = hasSearchQuery && !selectedEmployee;

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = employeeQuery.trim().toLowerCase();
    const baseList = normalizedQuery
      ? employees.filter((employee) =>
          employee.name.toLowerCase().includes(normalizedQuery),
        )
      : employees;

    return baseList.slice(0, 8);
  }, [employeeQuery, employees]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const data = await AttendanceApi.employees();
      setEmployees(data);
    } catch (error) {
      recordDiagnostic({
        source: "attendance.loadEmployees",
        message: "No se pudo cargar la lista del equipo.",
        error,
      });
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo cargar la lista del equipo.",
      );
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      const data = await AttendanceApi.dashboard();
      setDashboard(data);
    } catch (error) {
      recordDiagnostic({
        source: "attendance.loadDashboard",
        message: "No se pudo cargar el resumen del equipo.",
        error,
      });
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen del equipo.",
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const lookupEmployee = useCallback(
    async (employeeId?: number) => {
      const targetId = employeeId ?? selectedEmployee?.id;

      if (!targetId) {
        Alert.alert("Empleado requerido", "Selecciona una persona del equipo.");
        return;
      }

      try {
        setLoadingLookup(true);
        const data = await AttendanceApi.lookup(String(targetId));
        setLookup(data);
      } catch (error) {
        setLookup(null);
        recordDiagnostic({
          source: "attendance.lookupEmployee",
          message: `No se pudo cargar la ficha del empleado ${targetId}.`,
          error,
        });
        Alert.alert(
          "No encontrado",
          error instanceof Error
            ? error.message
            : "No se encontro el empleado.",
        );
      } finally {
        setLoadingLookup(false);
      }
    },
    [selectedEmployee],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDashboard(), loadEmployees()]);
      if (selectedEmployee?.id) {
        await lookupEmployee(selectedEmployee.id);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard, loadEmployees, lookupEmployee, selectedEmployee]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      loadEmployees();
    }, [loadDashboard, loadEmployees]),
  );

  const captureSelfie = async ({
    contextLabel = "registro del turno",
    persistPreview = true,
  }: {
    contextLabel?: string;
    persistPreview?: boolean;
  } = {}) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          `Necesitamos la camara para tomar la selfie del ${contextLabel}.`,
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [1, 1],
        quality: Platform.OS === "android" ? 0.45 : 0.6,
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.front,
        base64: false,
        exif: false,
      });

      if (result.canceled) {
        return null;
      }

      const nextSelfieUri = result.assets[0]?.uri ?? null;
      if (persistPreview) {
        setSelfieUri(nextSelfieUri);
      }
      return nextSelfieUri;
    } catch (error) {
      recordDiagnostic({
        source: "attendance.captureSelfie",
        message: `Fallo al abrir la camara para ${contextLabel}.`,
        error,
      });
      Alert.alert(
        "Error con la camara",
        "No pudimos completar la selfie en este momento. Intenta de nuevo.",
      );
      return null;
    }
  };

  const clearPunchState = () => {
    setEmployeeQuery("");
    setSelectedEmployee(null);
    setLookup(null);
    setSelfieUri(null);
  };

  const showSuccessFeedback = useCallback(
    async (title: string, message: string) => {
      if (Platform.OS !== "web") {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        } catch {
          // Ignore haptic failures on unsupported devices.
        }
      }

      setSuccessModal({ title, message });
    },
    [],
  );

  const closeSuccessFeedback = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.selectionAsync();
      } catch {
        // Ignore haptic failures on unsupported devices.
      }
    }

    setSuccessModal(null);
  }, []);

  const closeSecurityPrompt = useCallback((nextValue: string | null) => {
    const resolver = securityPromptResolverRef.current;
    securityPromptResolverRef.current = null;
    setSecurityPrompt(EMPTY_SECURITY_PROMPT);
    resolver?.(nextValue);
  }, []);

  const requestSecurityCode = useCallback(
    (employee: AttendanceEmployee | null, actionLabel: string) => {
      if (!employee?.requiresSecurityCode) {
        return Promise.resolve<string | null>(null);
      }

      return new Promise<string | null>((resolve) => {
        if (securityPromptResolverRef.current) {
          securityPromptResolverRef.current(null);
        }

        securityPromptResolverRef.current = resolve;
        setSecurityPrompt({
          visible: true,
          employeeName: employee.name,
          actionLabel,
          value: "",
          error: "",
        });
      });
    },
    [],
  );

  const runAction = async <T,>(
    action: () => Promise<T>,
    successMessage: string,
  ): Promise<T | null> => {
    try {
      setSubmitting(true);
      const result = await action();
      await loadDashboard();
      if (selectedEmployee?.id) {
        await lookupEmployee(selectedEmployee.id);
      }
      await showSuccessFeedback("Movimiento registrado", successMessage);
      return result;
    } catch (error) {
      recordDiagnostic({
        source: "attendance.runAction",
        message: "No se pudo completar una accion de control horario.",
        error,
      });
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo completar la accion.",
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) {
      Alert.alert("Empleado requerido", "Primero selecciona una persona.");
      return;
    }

    const selfieForAction =
      selfieUri ||
      (SELFIE_REQUIRED
        ? await captureSelfie({
            contextLabel: "inicio de turno",
            persistPreview: false,
          })
        : null);

    if (SELFIE_REQUIRED && !selfieForAction) {
      return;
    }

    const securityCode = await requestSecurityCode(
      selectedEmployee,
      "iniciar el turno",
    );

    if (selectedEmployee.requiresSecurityCode && !securityCode) {
      return;
    }

    try {
      const employeeName = selectedEmployee.name;
      setSubmitting(true);
      await AttendanceApi.clockIn(
        String(selectedEmployee.id),
        selfieForAction,
        securityCode,
      );
      clearPunchState();
      await loadDashboard();
      await showSuccessFeedback(
        "Ingreso registrado",
        `${employeeName} ya quedo en turno correctamente.`,
      );
    } catch (error) {
      recordDiagnostic({
        source: "attendance.clockIn",
        message: `Fallo el registro de ingreso para ${selectedEmployee.name}.`,
        error,
      });
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo completar la accion.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectEmployee = useCallback(
    async (employee: AttendanceEmployee) => {
      setSelectedEmployee(employee);
      setEmployeeQuery(employee.name);
      setSelfieUri(null);
      await lookupEmployee(employee.id);
    },
    [lookupEmployee],
  );

  const handleSelectTeamRow = useCallback(
    async (row: AttendanceTeamRow) => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      const employeeFromList = employees.find(
        (employee) => employee.id === row.employeeId,
      );

      await handleSelectEmployee({
        ...(employeeFromList || {
          id: row.employeeId,
          name: row.employeeName,
          image: row.employeeImage,
          employeeCode: row.employeeCode,
        }),
      });
    },
    [employees, handleSelectEmployee],
  );

  const handleStartBreak = async () => {
    if (!currentSession) return;
    const securityCode = await requestSecurityCode(
      currentEmployee,
      "iniciar el descanso",
    );
    if (currentEmployee?.requiresSecurityCode && !securityCode) {
      return;
    }
    await runAction(
      async () => AttendanceApi.startBreak(currentSession.sessionId, securityCode),
      "Descanso iniciado.",
    );
  };

  const handleEndBreak = async () => {
    if (!currentSession) return;
    const securityCode = await requestSecurityCode(
      currentEmployee,
      "finalizar el descanso",
    );
    if (currentEmployee?.requiresSecurityCode && !securityCode) {
      return;
    }
    await runAction(
      async () => AttendanceApi.endBreak(currentSession.sessionId, securityCode),
      "Descanso finalizado.",
    );
  };

  const handleClockOut = async () => {
    if (!currentSession || !currentEmployee) return;

    const selfieForAction =
      selfieUri ||
      (SELFIE_REQUIRED
        ? await captureSelfie({
            contextLabel: "final de turno",
            persistPreview: false,
          })
        : null);

    if (SELFIE_REQUIRED && !selfieForAction) {
      return;
    }

    const employee = currentEmployee;
    const sessionId = currentSession.sessionId;

    Alert.alert("Finalizar turno", "Se registrara la salida del empleado.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        style: "destructive",
        onPress: async () => {
          const securityCode = await requestSecurityCode(
            employee,
            "finalizar el turno",
          );

          if (employee.requiresSecurityCode && !securityCode) {
            return;
          }

          const session = await runAction(
            async () =>
              AttendanceApi.clockOut(sessionId, selfieForAction, securityCode),
            "Salida registrada correctamente.",
          );

          if (!session) {
            return;
          }

          clearPunchState();

          if (session.overtimeMinutes > 0) {
            Alert.alert(
              "Solicitud enviada",
              `Se detectaron ${formatMinutes(
                session.overtimeMinutes,
              )} de tiempo extra. La revision y aprobacion se hara en el dashboard web.`,
            );
          }
        },
      },
    ]);
  };

  const currentStatusMeta = currentSession
    ? SESSION_STATUS_META[currentSession.status]
    : null;
  const canUseBreakActions =
    BREAK_ACTION_ENABLED || Boolean(currentEmployee?.requiresSecurityCode);
  const isOpenSession =
    currentSession?.status === "ACTIVE" ||
    currentSession?.status === "ON_BREAK";
  const selectedAvatarUri = resolveImageUri(lookup?.employee.image);
  const expectedShiftLabel = lookup?.expectedShift.scheduledStart
    ? `${formatTime(lookup.expectedShift.scheduledStart)} - ${formatTime(
        lookup.expectedShift.scheduledEnd,
      )}`
    : "Flexible / no programado";

  const metrics = useMemo(
    () => [
      {
        label: "Trabajando",
        value: dashboard?.activeCount ?? 0,
        icon: "radio-outline" as const,
      },
      {
        label: "En descanso",
        value: dashboard?.onBreakCount ?? 0,
        icon: "cafe-outline" as const,
      },
      {
        label: "Con turno",
        value: dashboard?.assignedCount ?? 0,
        icon: "calendar-outline" as const,
      },
      {
        label: "Pendientes",
        value: dashboard?.pendingCount ?? 0,
        icon: "alert-circle-outline" as const,
      },
    ],
    [dashboard],
  );

  const teamFilterOptions = useMemo(
    () => [
      {
        key: "ACTIVE" as const,
        label: "En turno",
        count: dashboard?.activeCount ?? 0,
        dotColor: TEAM_STATUS_META.Trabajando.dot,
      },
      {
        key: "BREAK" as const,
        label: "Descanso",
        count: dashboard?.onBreakCount ?? 0,
        dotColor: TEAM_STATUS_META["En descanso"].dot,
      },
      {
        key: "ALL" as const,
        label: "Todos",
        count: dashboard?.rows?.length ?? 0,
        dotColor: "#A67C00",
      },
    ],
    [dashboard],
  );

  const filteredTeamRows = useMemo(() => {
    const rows = dashboard?.rows ?? [];

    switch (teamFilter) {
      case "ACTIVE":
        return rows.filter((row) => row.status === "Trabajando");
      case "BREAK":
        return rows.filter((row) => row.status === "En descanso");
      case "ALL":
      default:
        return rows;
    }
  }, [dashboard, teamFilter]);

  const quickActionMeta = useMemo<QuickActionMeta>(() => {
    if (!currentSession) {
      return {
        badgeLabel: selfieUri
          ? "Selfie lista"
          : SELFIE_REQUIRED
            ? "Requiere selfie"
            : "Listo para fichar",
        badgeBg: selfieUri ? "#ECFDF5" : "#FFF4D6",
        badgeText: selfieUri ? "#166534" : "#8A6414",
        title: selfieUri
          ? "Todo listo para registrar tu ingreso"
          : "Inicia tu turno en un toque",
        description: SELFIE_REQUIRED
          ? selfieUri
            ? "Tu selfie ya quedo preparada. Solo falta confirmar el ingreso."
            : "Al tocar el boton abriremos la camara frontal para tomar la selfie del registro."
          : "Puedes registrar la entrada de inmediato desde esta misma tarjeta.",
        icon: selfieUri ? "checkmark-circle" : "camera-outline",
        iconBg: selfieUri ? "#DCFCE7" : "#FFF1C7",
        iconColor: selfieUri ? "#16A34A" : "#A67C00",
        border: selfieUri ? "#CFE8D2" : "#E8D39B",
        gradient: selfieUri
          ? (["#F0FDF4", "#FFFFFF"] as const)
          : (["#FFF9E8", "#FFFFFF"] as const),
      };
    }

    if (currentSession.status === "ACTIVE") {
      return {
        badgeLabel: "Turno abierto",
        badgeBg: "#DCFCE7",
        badgeText: "#166534",
        title: "Tu turno esta activo",
        description:
          "La accion principal queda visible aqui arriba para que puedas cerrarlo rapido cuando lo necesites.",
        icon: "play-circle-outline" as const,
        iconBg: "#DCFCE7",
        iconColor: "#16A34A",
        border: "#CFE8D2",
        gradient: ["#F0FDF4", "#FFFFFF"] as const,
      };
    }

    if (currentSession.status === "ON_BREAK") {
      return {
        badgeLabel: "En descanso",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        title: "El turno esta pausado",
        description:
          "Puedes retomar el turno o finalizarlo desde esta seccion sin bajar en la pantalla.",
        icon: "cafe-outline" as const,
        iconBg: "#FEF3C7",
        iconColor: "#D97706",
        border: "#EED7A0",
        gradient: ["#FFF8EA", "#FFFFFF"] as const,
      };
    }

    return {
      badgeLabel: "Finalizado",
      badgeBg: "#E2E8F0",
      badgeText: "#475569",
      title: "Este turno ya termino",
      description:
        "La ficha queda disponible como resumen rapido del ultimo movimiento.",
      icon: "checkmark-done-outline" as const,
      iconBg: "#E2E8F0",
      iconColor: "#64748B",
      border: "#CBD5E1",
      gradient: ["#F8FAFC", "#FFFFFF"] as const,
    };
  }, [currentSession, selfieUri]);

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-[#F9F7F1]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
      >
        <View className="bg-white border border-[#E7DFC4] rounded-[28px] p-5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-semibold text-[#111827]">
                Control horario
              </Text>
              <Text className="text-[#6B7280] mt-2 leading-5">
                Busca tu nombre, seleccionalo y registra tu turno rapido. La
                aprobacion de novedades y horas extra se hace en el dashboard
                web.
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-[#FFF5D6] items-center justify-center">
              <Ionicons name="time-outline" size={24} color="#A67C00" />
            </View>
          </View>

          <View className="mt-5">
            <Text className="text-[#6A5F3B] text-xs uppercase tracking-wide font-semibold mb-2">
              Busca tu nombre
            </Text>
            <View className="flex-row items-center bg-[#F9F7F1] border border-[#E7DFC4] rounded-2xl px-4">
              <Ionicons name="search-outline" size={18} color="#A67C00" />
              <TextInput
                value={employeeQuery}
                onChangeText={(text) => {
                  setEmployeeQuery(text);
                  setSelectedEmployee(null);
                  setLookup(null);
                  setSelfieUri(null);
                }}
                placeholder="Escribe el nombre de la persona"
                className="flex-1 text-[#111827] py-4 ml-3"
                autoCapitalize="words"
              />
              {(loadingEmployees || loadingLookup) && (
                <ActivityIndicator color="#A67C00" />
              )}
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={clearPunchState}
                disabled={submitting}
                className="flex-1 rounded-2xl py-4 border border-[#D6CBA3] bg-[#FFFDF8] items-center"
              >
                <Text className="text-[#7A5C00] font-semibold">Limpiar</Text>
              </TouchableOpacity>
            </View>

            {!selectedEmployee && !hasSearchQuery ? (
              <Text className="text-[#8B7355] text-sm mt-4 ml-1">
                Empieza a escribir para ver sugerencias.
              </Text>
            ) : null}

            {showSearchResults ? (
              <View className="mt-4 bg-white border border-[#E7DFC4] rounded-2xl overflow-hidden">
                {loadingEmployees ? (
                  <View className="p-4">
                    <Text className="text-[#6B7280] text-center">
                      Cargando equipo de monitoreo...
                    </Text>
                  </View>
                ) : filteredEmployees.length ? (
                  filteredEmployees.map((employee, index) => (
                    <View
                      key={employee.id}
                      className={
                        index < filteredEmployees.length - 1
                          ? "border-b border-[#F0E7CE]"
                          : ""
                      }
                    >
                      <EmployeeOptionCard
                        employee={employee}
                        selected={false}
                        onPress={() => {
                          void handleSelectEmployee(employee);
                        }}
                      />
                    </View>
                  ))
                ) : (
                  <View className="p-4">
                    <Text className="text-[#6B7280] text-center">
                      No encontramos personas con ese nombre.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {selectedEmployee && loadingLookup && !lookup ? (
            <View className="mt-5 bg-[#FBFAF4] border border-[#E7DFC4] rounded-[24px] p-5 items-center">
              <ActivityIndicator color="#A67C00" />
              <Text className="text-[#6B7280] mt-3 text-center">
                Cargando la ficha operativa del empleado...
              </Text>
            </View>
          ) : null}

          {lookup && (
            <View className="mt-5 overflow-hidden rounded-[28px] border border-[#E7DFC4] bg-[#FFFCF4]">
              <LinearGradient
                colors={["#FFF9E8", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 16 }}
              >
                <View className="flex-row items-start">
                  <View className="flex-row flex-1 items-start">
                    {selectedAvatarUri ? (
                      <Image
                        source={{ uri: selectedAvatarUri }}
                        className="w-16 h-16 rounded-full mr-3"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-full bg-[#E8D9A7] mr-3 items-center justify-center">
                        <Text className="text-[#7A5C00] font-semibold text-2xl">
                          {lookup.employee.name?.charAt(0)?.toUpperCase() ||
                            "?"}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        className="text-[#151515] text-[23px] leading-[27px] font-semibold"
                        style={{ flexShrink: 1 }}
                      >
                        {lookup.employee.name}
                      </Text>
                      <Text className="text-[#8B7355] mt-1">
                        {lookup.expectedShift.title ||
                          "Sin turno cercano programado"}
                      </Text>
                      {currentEmployee?.requiresSecurityCode ? (
                        <View className="mt-3 self-start rounded-full bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-2">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={15}
                              color="#3657B4"
                            />
                            <Text className="text-[#3657B4] ml-2 font-semibold text-xs">
                              Perfil administrativo protegido con PIN
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      <View className="mt-3 self-start">
                        {currentStatusMeta && currentSession ? (
                          <View
                            className="px-3 py-2 rounded-2xl"
                            style={{ backgroundColor: currentStatusMeta.bg }}
                          >
                            <View className="flex-row items-center">
                              <Ionicons
                                name={currentStatusMeta.icon}
                                size={16}
                                color={currentStatusMeta.text}
                              />
                              <Text
                                style={{
                                  color: currentStatusMeta.text,
                                  marginLeft: 6,
                                  fontWeight: "600",
                                }}
                              >
                                {currentStatusMeta.label}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View className="px-3 py-2 rounded-2xl bg-[#FFF6DE] border border-[#E8D39B]">
                            <View className="flex-row items-center">
                              <Ionicons
                                name="time-outline"
                                size={16}
                                color="#8A6414"
                              />
                              <Text className="text-[#8A6414] ml-2 font-semibold">
                                Sin fichar
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                <View
                  className="mt-4 overflow-hidden rounded-[24px] border"
                  style={{ borderColor: quickActionMeta.border }}
                >
                  <LinearGradient
                    colors={quickActionMeta.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 16 }}
                  >
                    <View className="flex-row items-start">
                      <View
                        className="w-12 h-12 rounded-[18px] items-center justify-center mr-3"
                        style={{ backgroundColor: quickActionMeta.iconBg }}
                      >
                        <Ionicons
                          name={quickActionMeta.icon}
                          size={24}
                          color={quickActionMeta.iconColor}
                        />
                      </View>

                      <View className="flex-1">
                        <View
                          className="self-start rounded-full px-3 py-1"
                          style={{ backgroundColor: quickActionMeta.badgeBg }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: quickActionMeta.badgeText }}
                          >
                            {quickActionMeta.badgeLabel}
                          </Text>
                        </View>
                        <Text className="text-[#151515] text-lg font-semibold mt-3">
                          {quickActionMeta.title}
                        </Text>
                        <Text className="text-[#5B6472] mt-2 leading-5">
                          {quickActionMeta.description}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 gap-3">
                      {!currentSession && (
                        <ActionButton
                          onPress={handleClockIn}
                          disabled={submitting || loadingLookup}
                          label={
                            submitting ? "Registrando..." : "Iniciar turno"
                          }
                          tone="success"
                          icon="play-circle-outline"
                        />
                      )}

                      {currentSession?.status === "ACTIVE" &&
                        canUseBreakActions && (
                          <ActionButton
                            onPress={handleStartBreak}
                            disabled={submitting}
                            label="Iniciar descanso"
                            tone="soft"
                            icon="cafe-outline"
                          />
                        )}

                      {currentSession?.status === "ACTIVE" && (
                        <ActionButton
                          onPress={handleClockOut}
                          disabled={submitting}
                          label="Finalizar turno"
                          tone="warning"
                          icon="stop-circle-outline"
                        />
                      )}

                      {currentSession?.status === "ON_BREAK" && (
                        <>
                          <ActionButton
                            onPress={handleEndBreak}
                            disabled={submitting}
                            label="Terminar descanso"
                            tone="soft"
                            icon="play-forward-outline"
                          />
                          <ActionButton
                            onPress={handleClockOut}
                            disabled={submitting}
                            label="Finalizar turno"
                            tone="warning"
                            icon="stop-circle-outline"
                          />
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </View>

                <View className="flex-row flex-wrap mt-4 gap-2">
                  <InfoPill
                    label="Turno esperado"
                    value={expectedShiftLabel}
                    tone={
                      lookup.expectedShift.scheduled ? "default" : "warning"
                    }
                  />
                  {currentSession ? (
                    <InfoPill
                      label="Estado"
                      value={currentStatusMeta?.label || "Activa"}
                      tone="success"
                    />
                  ) : null}
                  {currentSession ? (
                    <InfoPill
                      label="Entrada"
                      value={formatTime(currentSession.clockInAt)}
                    />
                  ) : null}
                  {currentSession ? (
                    <InfoPill
                      label="Tiempo actual"
                      value={formatMinutes(currentSession.workedMinutes)}
                      tone="success"
                    />
                  ) : null}
                  {currentSession ? (
                    <InfoPill
                      label="Descanso"
                      value={formatMinutes(currentSession.breakMinutes)}
                    />
                  ) : null}
                  {currentSession ? (
                    <InfoPill
                      label="Salida"
                      value={
                        isOpenSession
                          ? "--:--"
                          : formatTime(currentSession.clockOutAt)
                      }
                    />
                  ) : null}
                  {currentSession?.lateMinutes ? (
                    <InfoPill
                      label="Llegada tarde"
                      value={formatMinutes(currentSession.lateMinutes)}
                      tone="danger"
                    />
                  ) : null}
                  {currentSession?.overtimeMinutes ? (
                    <InfoPill
                      label="Extra detectado"
                      value={formatMinutes(currentSession.overtimeMinutes)}
                      tone="success"
                    />
                  ) : null}
                </View>

                <View className="mt-3 bg-white border border-[#EEE5C9] rounded-2xl px-4 py-3 flex-row items-start">
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#A67C00"
                    style={{ marginTop: 1, marginRight: 10 }}
                  />
                  <Text className="flex-1 text-[#5A5446] leading-5">
                    {lookup.message}
                  </Text>
                </View>

                {!currentSession && (
                  <View className="mt-4">
                    {SELFIE_REQUIRED ? (
                      <SelfieCaptureCard
                        selfieUri={selfieUri}
                        onCapture={() => {
                          void captureSelfie();
                        }}
                        onClear={() => setSelfieUri(null)}
                        disabled={submitting}
                      />
                    ) : (
                      <View className="border border-[#D6CBA3] rounded-2xl bg-[#FFFBEA] p-4">
                        <Text className="text-[#7A5C00] font-semibold text-center">
                          Modo prueba web
                        </Text>
                        <Text className="text-[#8B7355] text-sm mt-2 text-center">
                          En el navegador puedes iniciar turno sin tomar selfie.
                          El sistema enviara una marca de prueba para que
                          ensayes el flujo.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </LinearGradient>
            </View>
          )}
        </View>

        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xl font-semibold text-[#151515]">
                Estado del equipo
              </Text>
              <Text className="text-[#6B7280] mt-1">
                Resumen operativo del {formatDate(dashboard?.operationalDate)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={refreshAll}
              className="w-11 h-11 rounded-2xl bg-white border border-[#E7DFC4] items-center justify-center"
            >
              <Ionicons name="refresh-outline" size={20} color="#A67C00" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap gap-3 mb-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
              />
            ))}
          </View>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {teamFilterOptions.map((option) => (
              <TeamFilterChip
                key={option.key}
                label={option.label}
                count={option.count}
                dotColor={option.dotColor}
                selected={teamFilter === option.key}
                onPress={() => setTeamFilter(option.key)}
              />
            ))}
          </View>

          {loadingDashboard ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#A67C00" />
              <Text className="text-[#6B7280] mt-3">
                Cargando resumen del equipo...
              </Text>
            </View>
          ) : filteredTeamRows.length ? (
            filteredTeamRows.map((row) => (
              <TeamRowCard
                key={row.employeeId}
                row={row}
                onPress={() => {
                  void handleSelectTeamRow(row);
                }}
              />
            ))
          ) : dashboard?.rows?.length ? (
            <View className="bg-white border border-[#E7DFC4] rounded-[24px] p-6 items-center">
              <Ionicons
                name={
                  teamFilter === "BREAK" ? "cafe-outline" : "people-outline"
                }
                size={36}
                color="#A67C00"
              />
              <Text className="text-[#151515] font-semibold mt-3">
                {teamFilter === "ACTIVE"
                  ? "No hay personas trabajando ahora"
                  : teamFilter === "BREAK"
                    ? "Nadie esta en descanso ahora"
                    : "No hay datos para mostrar"}
              </Text>
              <Text className="text-[#6B7280] mt-2 text-center">
                Cambia el filtro si quieres ver el resto del equipo del dia.
              </Text>
            </View>
          ) : (
            <View className="bg-white border border-[#E7DFC4] rounded-[24px] p-6 items-center">
              <Ionicons name="people-outline" size={36} color="#A67C00" />
              <Text className="text-[#151515] font-semibold mt-3">
                No hay datos de asistencia
              </Text>
              <Text className="text-[#6B7280] mt-2 text-center">
                Cuando el equipo empiece a fichar, aqui veras el estado del
                turno.
              </Text>
            </View>
          )}
        </View>
        <AppVersionFooter />
      </ScrollView>

      <SuccessFeedbackModal
        visible={Boolean(successModal)}
        title={successModal?.title || ""}
        message={successModal?.message || ""}
        onClose={() => {
          void closeSuccessFeedback();
        }}
      />
      <SecurityCodeModal
        visible={securityPrompt.visible}
        employeeName={securityPrompt.employeeName}
        actionLabel={securityPrompt.actionLabel}
        value={securityPrompt.value}
        error={securityPrompt.error}
        onChangeText={(nextValue) =>
          setSecurityPrompt((current) => ({
            ...current,
            value: nextValue,
            error: "",
          }))
        }
        onCancel={() => closeSecurityPrompt(null)}
        onSubmit={() => {
          const normalizedValue = securityPrompt.value.trim();
          if (!normalizedValue) {
            setSecurityPrompt((current) => ({
              ...current,
              error: "Ingresa el codigo de seguridad.",
            }));
            return;
          }
          closeSecurityPrompt(normalizedValue);
        }}
      />
    </>
  );
}
