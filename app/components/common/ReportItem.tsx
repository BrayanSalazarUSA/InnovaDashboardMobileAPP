import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET;

type Props = {
  report: any;
  onPress?: () => void;
};

const stateStyles = {
  PENDING: { label: "Pendiente", color: "#C9A13B", icon: "clock-outline" },
  IN_PROGRESS: { label: "En proceso", color: "#2196F3", icon: "progress-clock" },
  COMPLETED: { label: "Terminado", color: "#4CAF50", icon: "check-circle-outline" },
};

export default function ReportItem({ report, onPress }: Props) {
  const { caseType, property, madeBy, status, reportDetails, followings, evidences, incidentDate, contributedBy, priority } = report;
  const followingsCount = followings?.length || 0;
  const evidencesCount = evidences?.length || 0;

  const { label, color, icon } = stateStyles[status || "PENDING"];

  // Avatar fallback inicial del nombre
  const avatarInitial = madeBy?.name ? madeBy.name[0].toUpperCase() : "?";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="bg-white border border-[#F2DEA2] rounded-2xl p-4 mb-3 shadow-sm"
    >
      {/* HEADER */}
      <View className="flex-row justify-between items-center mb-2">
        
         <Text className="text-lg font-semibold text-gray-900 mr-2">
    {report.caseType?.translate  || "Caso sin tipo"} {report.priority == "ALTA" && (
    <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
  )}
  </Text>

        <View className="flex-row items-center px-3 py-1 rounded-full"
          style={{ backgroundColor: color + "20" }}
        >
          <MaterialCommunityIcons name={icon} size={16} color={color} />
          <Text style={{ color, fontWeight: "600", marginLeft: 4 }}>
            {label}
          </Text>
        </View>
      </View>

      {/* PROPERTY & DATE */}
      <View className="flex-row items-center">
        {property?.name && <Text className="text-gray-600 text-sm">{property.name}</Text>}
        {incidentDate && <Text className="text-gray-400 text-xs ml-2">• {incidentDate}</Text>}
      </View>

 <View className="mt-3">

  {/* FILA: CREADO POR - ATENDIDO POR */}
  <View className="flex-row items-center justify-between">

    {/* CREADO POR */}
    <View className="flex-row items-center gap-2 flex-[1.7]">
      {contributedBy?.image ? (
        <Image
          source={{ uri: `${BUCKET_URL}${contributedBy.image}` }}
          className="w-10 h-10 rounded-full border border-[#C9A13B]"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-[#C9A13B] items-center justify-center">
          <Text className="text-white font-bold">
            {contributedBy?.name?.charAt(0) ?? "?"}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <Text className="text-[#6A5F3B] text-xs uppercase font-semibold tracking-wide">
          Creado por
        </Text>
        <Text
          className="text-gray-800 font-medium text-sm"
          numberOfLines={1}
        >
          {contributedBy?.name || "Sin responsable"}
        </Text>
      </View>
    </View>

    {/* ATENDIDO POR */}
    <View className="flex-row items-center gap-1 flex-[0.7] justify-end">

      {madeBy?.image && (
        <Image
          source={{ uri: `${BUCKET_URL}${madeBy.image}` }}
          className="w-7 h-7 rounded-full border border-[#C9A13B]"
        />
      )}

      <View className="flex-col items-end max-w-full">
        <Text className="text-[#6A5F3B] text-xs uppercase font-semibold tracking-wide">
          Atendido por
        </Text>

        <Text
          className="text-gray-800 text-sm font-medium"
          numberOfLines={1}
        >
          {madeBy?.name || "No asignado"}
        </Text>

        {status === "IN_PROGRESS" && (
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <Text className="text-blue-500 text-xs font-medium">Trabajando...</Text>
          </View>
        )}

        {status === "COMPLETED" && (
          <Text className="text-green-600 text-xs font-medium">Completado ✅</Text>
        )}
      </View>

    </View>
  </View>
</View>


      {/* DESCRIPTION */}
      {reportDetails && (
        <Text
          className="text-gray-600 text-sm mt-3"
          numberOfLines={2}
        >
          {reportDetails}
        </Text>
      )}

      {/* FOOTER */}
      <View className="flex-row items-center mt-4 gap-4">
        {followingsCount > 0 && (
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="video-outline" size={17} color="#A67C00" />
            <Text className="text-[#A67C00] text-xs ml-1">{followingsCount} seguimientos</Text>
          </View>
        )}

        {evidencesCount > 0 && (
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="folder-outline" size={17} color="#A67C00" />
            <Text className="text-[#A67C00] text-xs ml-1">{evidencesCount} evidencias</Text>
          </View>
        )}
      </View>


    </TouchableOpacity>
  );
}
