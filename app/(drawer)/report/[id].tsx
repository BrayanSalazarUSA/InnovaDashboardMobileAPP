import Header from "@/app/components/common/Header";
import EvidencesGallery from "@/app/components/ui/EvidencesGallery";
import { ApiService } from "@/app/services/api";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";



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

  useEffect(() => {
    // Aquí llamarás a tu servicio real:
     ApiService.getReportById(id).then(setReport).finally(() => setLoading(false));

  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F7F1]">
        <ActivityIndicator size="large" color="#C9A13B" />
        <Text className="text-gray-600 mt-3">Cargando reporte...</Text>
      </View>
    );
  }

  const { label, color } = statusLabels[report.status] || statusLabels.PENDING;;

  return (
    <View className="flex-1 bg-[#F9F7F1] mb-16">
      <Header title="Detalle del Reporte" onBack={() => router.back()} />

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
      <Text style={{ color, fontWeight: "600", fontSize: 12 }}>{label}</Text>
    </View>
  </View>

  {/* Derecha: Botones de acción */}
  <View className="flex-row items-center gap-3">
    <TouchableOpacity
      onPress={() => console.log("Editar reporte")}
      className="p-2 rounded-full bg-[#F5F2E8] active:opacity-80">
      <MaterialCommunityIcons name="pencil-outline" size={20} color="#C9A13B" />
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => console.log("Eliminar reporte")}
      className="p-2 rounded-full bg-[#F5F2E8] active:opacity-80">
      <MaterialCommunityIcons name="delete-outline" size={20} color="#E53935" />
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
          <InfoRow label="Detalles del reporte" value={report.reportDetails}/>
          <Text> </Text>
        </View>

       
        {/* Personas involucradas */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#EDE8D3]">
          <SectionTitle text="Reportado por" />
          <Text className="text-gray-800 font-medium mb-3">{report.contributedBy.name}</Text>

          <SectionTitle text="Atendido por" />
         <View className="flex-row items-center mt-1">
  {report?.madeBy?.image && (
    <Image
      source={{ uri: BUCKET_URL + report.madeBy.image }}
      className="w-8 h-8 rounded-full border border-[#C9A13B] mr-2"
    />
  )}
  <Text className="text-gray-800 font-medium">
    {report?.madeBy?.name || "Sin asignar"}
  </Text>
</View>

        </View>

{/* Seguimientos */}
       <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-[#EDE8D3]">
  <SectionTitle text="Seguimientos" />

  {report.followings?.length > 0 ? (
    report.followings.map((f: any, index: number) => (
      <View
        key={f.id || index}
        className="bg-[#F9F7F1] rounded-xl p-3 mb-3 border border-[#E4D8B4]">
        {/* Encabezado con cámara y hora */}
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="cctv"
              size={18}
              color="#A67C00"
              style={{ marginRight: 6 }}
            />
            <Text className="text-gray-900 font-semibold">{f.camera || "Cámara desconocida"}</Text>
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
              {f?.timeType || "EE.UU"}
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
     <EvidencesGallery report={report} BUCKET_URL={BUCKET_URL}/>
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

 