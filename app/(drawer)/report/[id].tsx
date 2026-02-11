import Header from "@/app/components/common/Header";
import EvidencesGallery from "@/app/components/ui/EvidencesGallery";
import IncidentLocationsViewer from "@/app/components/ui/IncidentLocationsViewer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiService } from "../../../services/api";
const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET;

const statusLabels = {
  PENDING: { label: "Pendiente", color: "#C9A13B" },
  IN_PROGRESS: { label: "En proceso", color: "#2196F3" },
  COMPLETED: { label: "Completado", color: "#4CAF50" },
};

export default function ReportDetail() {
  const { id } = useLocalSearchParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  function shortenName(name: string, max = 10) {
    if (!name) return "";
    return name.length > max ? name.substring(0, max) + "..." : name;
  }

  // 6 horas tiene de plazo
  const canEditOrDelete = (createdAt, hours = 6) => {
    if (!createdAt) return false;

    const createdDate = new Date(createdAt.replace(" ", "T")); // convertir string → Date
    const now = new Date();

    const diffMs = now - createdDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours <= hours;
  };

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadReport = async () => {
        try {
          setLoading(true);
          const data = await ApiService.getReportById(id);
          if (isActive) setReport(data);
        } catch (e) {
          console.error("Error recargando reporte:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      // Cargar cada vez que la pantalla se enfoca
      loadReport();

      // Control del botón físico de retroceso
      const onBackPress = () => {
        router.replace("/(drawer)");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      // Cleanup
      return () => {
        isActive = false;
        subscription.remove();
      };
    }, [id])
  );
  const handleDelete = async () => {
    console.log("Eliminando reporte");
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de eliminar este reporte?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await ApiService.deleteReport(id, 5);
              Alert.alert("✅ Eliminado", "Reporte eliminado correctamente.");
              router.replace("/(drawer)");
            } catch (error) {
              Alert.alert("❌ Error", "No se pudo eliminar el reporte.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F1]">
        <ActivityIndicator size="large" color="#C9A13B" />
        <Text className="text-gray-600 mt-3">Cargando reporte...</Text>
      </View>
    );
  }

  const { label, color } = statusLabels[report.status] || statusLabels.PENDING;

  const isAllowed = canEditOrDelete(report.createdAt);

  return (
    <View className="flex-1 bg-[#F9F7F1] mb-16">
      <Header title="Detalle del Reporte" onBack={() => router.replace("/")} />

      <ScrollView className="p-4">
        {/* Encabezado principal */}

        {/* Encabezado principal */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm flex-row items-center justify-between">
          {/* Izquierda: Título + estado */}
          <View className="flex-1">
            <Text className="text-[18px] font-semibold text-gray-900 mb-1">
              {report.caseType.translate}
            </Text>
            <View
              className="self-start px-3 py-[2px] rounded-full"
              style={{ backgroundColor: color + "20" }}
            >
              <Text style={{ color, fontWeight: "600", fontSize: 12 }}>
                {label}
              </Text>
            </View>
          </View>

          {/* Derecha: Botones de acción */}

          <View className="flex-row items-center gap-3">
            {/* EDITAR */}
            <TouchableOpacity
              disabled={!isAllowed}
              className={`p-2 rounded-full ${isAllowed ? "bg-[#F5F2E8]" : "bg-gray-300"}`}
              onPress={() => router.push(`/new?id=${report.id}`)}
              style={{ opacity: isAllowed ? 1 : 0.5 }}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color={isAllowed ? "#C9A13B" : "#777"}
              />
            </TouchableOpacity>

            {/* ELIMINAR */}
            <TouchableOpacity
              disabled={!isAllowed}
              onPress={() => handleDelete()}
              className={`p-2 rounded-full ${isAllowed ? "bg-[#F5F2E8]" : "bg-gray-300"}`}
              style={{ opacity: isAllowed ? 1 : 0.5 }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={isAllowed ? "#E53935" : "#777"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Información principal */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#EDE8D3]">
          <InfoRow label="Propiedad" value={report.property.name} />
          <InfoRow label="Fecha" value={report.incidentDate} />
          <InfoRow
            label="Tiempo"
            value={`${report.incidentStartTime} - ${report.incidentEndTime}`}
          />
          <InfoRow label="Detalles del reporte" value={report.reportDetails} />
          <Text> </Text>
        </View>

        {/* Personas involucradas */}
        {/* Personas involucradas */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#EDE8D3]">
          {/* Título */}
          <SectionTitle text="Personas involucradas" />

          <View className="flex-row items-center justify-between mt-3">
            {/* --- Reportado por --- */}
            <View className="flex-row items-center flex-1">
              {/* Avatar */}
              <View className="w-10 h-10 rounded-full bg-[#F4EBD0] border border-[#C9A13B] mr-3 items-center justify-center">
                {report?.contributedBy?.image ? (
                  <Image
                    source={{ uri: BUCKET_URL + report.contributedBy.image }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Text className="text-[#A67C00] font-semibold text-lg">
                    {report.contributedBy?.name?.[0] || "?"}
                  </Text>
                )}
              </View>

              <View>
                <Text className="text-[12px] text-gray-500">Reportado por</Text>
                <Text className="text-gray-900 font-semibold">
                  {shortenName(report.contributedBy.name, 12)}
                </Text>
              </View>
            </View>

            {/* Separador vertical */}
            <View className="w-[1px] h-10 bg-[#EDE8D3] mx-3" />

            {/* --- Atendido por --- */}
            <View className="flex-row items-center flex-1">
              {/* Avatar */}
              <View className="w-10 h-10 rounded-full bg-[#F4EBD0] border border-[#C9A13B] mr-3 items-center justify-center">
                {report?.madeBy?.image ? (
                  <Image
                    source={{ uri: BUCKET_URL + report.madeBy.image }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Text className="text-[#A67C00] font-semibold text-lg">
                    {shortenName(report?.madeBy?.name, 12) || "?"}
                  </Text>
                )}
              </View>

              <View>
                <Text className="text-[12px] text-gray-500">Atendido por</Text>
                <Text className="text-gray-900 font-semibold">
                  {report?.madeBy?.name || "Sin asignar"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seguimientos */}
        <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-[#EDE8D3]">
          <SectionTitle text="Seguimientos" />

          {report.followings?.length > 0 ? (
            report.followings.map((f: any, index: number) => (
              <View
                key={f.id || index}
                className="bg-[#F9F7F1] rounded-xl p-3 mb-3 border border-[#E4D8B4]"
              >
                {/* Encabezado con cámara y hora */}
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="cctv"
                      size={18}
                      color="#A67C00"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-gray-900 font-semibold">
                      {f.camera || "Cámara desconocida"}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color="#6A5F3B"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-xs text-gray-700 font-medium">
                      {f?.time || "Sin Hora"}
                    </Text>
                  </View>
                </View>

                {/* Descripción */}
                <Text className="text-gray-800 text-sm mb-1">
                  {f.description || "Sin descripción registrada."}
                </Text>

                {/* Tipo de hora (si aplica) */}
                <View className="self-start px-2 py-0.5 rounded-full bg-[#EDE8D3]">
                  <Text className="text-[11px] text-[#6A5F3B] font-medium">
                    {f?.category || "EE.UU"}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 text-center italic mt-2">
              No hay seguimientos registrados aún.
            </Text>
          )}
        </View>
        <EvidencesGallery report={report} BUCKET_URL={BUCKET_URL} />
        {/* Ubicaciones del incidente */}
        {report?.incidentLocations?.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-[#EDE8D3]">
            <SectionTitle text="Ubicaciones del incidente" />

            <IncidentLocationsViewer
              property={report.property}
              locations={report.incidentLocations}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className="text-gray-700 text-[14px] mb-1">
      <Text className="font-semibold">{label}: </Text>
      {value}
    </Text>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <Text className="text-[#6A5F3B] text-xs uppercase font-semibold tracking-wide mb-1">
      {text}
    </Text>
  );
}
