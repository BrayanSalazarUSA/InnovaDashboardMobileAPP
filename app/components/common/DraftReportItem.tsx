import { LocalDraftReport } from "@/types/LocalDraftReport";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

type Props = {
  draft: LocalDraftReport;
  onOpen: () => void;
  onDelete: () => void;
};

export default function DraftReportItem({ draft, onOpen, onDelete }: Props) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      className="bg-white border border-[#E4D8B4] rounded-2xl p-4 mb-3 shadow-sm"
    >
      {/* =======================
          HEADER
      ======================= */}
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-2">
          <Text className="text-xs uppercase tracking-wide text-[#6A5F3B] font-semibold">
            {draft.propertyName || "Propiedad no seleccionada"}
          </Text>

          <Text
            className="text-lg font-semibold text-gray-900 mt-1"
            numberOfLines={2}
          >
            {draft.incidentLabel || "Incidente sin definir"}
          </Text>
        </View>

        {/* DELETE */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Eliminar borrador",
              "¿Deseas eliminar este reporte guardado?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: onDelete,
                },
              ],
            );
          }}
          hitSlop={10}
        >
          <Ionicons name="trash-outline" size={20} color="#C62828" />
        </TouchableOpacity>
      </View>

      {/* =======================
          BADGES
      ======================= */}
      <View className="flex-row items-center gap-3 mt-3">
        <View className="flex-row items-center bg-[#FFF3E0] px-3 py-1 rounded-full">
          <MaterialCommunityIcons
            name="file-document-edit-outline"
            size={14}
            color="#A67C00"
          />
          <Text className="text-xs text-[#A67C00] ml-1 font-semibold">
            Borrador
          </Text>
        </View>

        {draft.isHighPriority && (
          <View className="flex-row items-center bg-[#FDECEA] px-3 py-1 rounded-full">
            <Ionicons name="alert-circle" size={14} color="#D32F2F" />
            <Text className="text-xs text-[#D32F2F] ml-1 font-semibold">
              Prioridad Alta
            </Text>
          </View>
        )}
      </View>

      {/* =======================
          MONITOR
      ======================= */}
      <View className="flex-row items-center mt-3">
        <MaterialCommunityIcons
          name="account-outline"
          size={18}
          color="#6A5F3B"
        />
        <Text className="text-sm text-gray-700 ml-2" numberOfLines={1}>
          {draft.monitorName || "Monitor no asignado"}
        </Text>
      </View>

      {/* =======================
          DESCRIPTION
      ======================= */}
      <Text className="text-gray-600 text-sm mt-2" numberOfLines={2}>
        {draft.description || "Sin descripción aún"}
      </Text>

      {/* =======================
          FOOTER
      ======================= */}
      <Text className="text-xs text-gray-400 mt-3">
        Última edición: {new Date(draft.updatedAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
}
