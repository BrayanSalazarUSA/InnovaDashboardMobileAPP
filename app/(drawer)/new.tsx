import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Header from "../components/common/Header";
import CameraFollowingsForm from "../components/ui/CamerasFollowingForm";
import ImageUploader from "../components/ui/ImageUploader";
import IncidentLocationsSelector from "../components/ui/IncidentLocationsSelector";
import IncidentPicker from "../components/ui/IncidentPicker";
import MonitorPicker from "../components/ui/MonitorPicker";
import PropertyPicker from "../components/ui/PropertyPicker";
import TextAreaInput from "../components/ui/TextAreaInput";
import TimePickerInput from "../components/ui/TimePickerInput";
import { ApiService } from "../services/api";

const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET;

export default function NewReport() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Campos del formulario
  const [propertyId, setPropertyId] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [monitorId, setMonitorId] = useState("");
  const [incidentLocations, setIncidentLocations] = useState<any[]>([]);
const [followings, setFollowings] = useState([]); // vacío al inicio
  const [isHighPriority, setIsHighPriority] = useState(false);

  // Listas base
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [currentReport, setCurrentReport] = useState<any>(null);

  //  Reiniciar formulario
  const resetForm = () => {
    setPropertyId("");
    setIncidentId("");
    setStartTime("");
    setEndTime("");
    setDescription("");
    setImages([]);
    setMonitorId("");
    setIsHighPriority(false);
    setIncidentLocations([]);
  setFollowings([]);
  };

  // Forzar remount del formulario si cambia ID
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [id]);

  const scrollRef = useRef<ScrollView>(null);

  // Mover scroll al inicio cada vez que la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Cargar catálogos base
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [props, mons, incs] = await Promise.all([
          ApiService.getProperties(),
          ApiService.getMonitors(),
          ApiService.getIncidents(),
        ]);
        setProperties(props || []);
        setMonitors(mons || []);
        setIncidents(incs || []);
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };
    loadInitialData();
  }, []);

  // Cargar edificios según propiedad seleccionada
  useEffect(() => {
    if (!propertyId) return setBuildings([]);
    const loadBuildings = async () => {
      try {
        const result = await ApiService.getBuildings(propertyId);
        setBuildings(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Error cargando edificios:", err);
        setBuildings([]);
      }
    };
    loadBuildings();
  }, [propertyId]);

  // Función para cargar los datos de un reporte
  const loadReportData = async (reportId: string) => {
    try {
      setLoading(true);
      const report = await ApiService.getReportById(reportId);
      if (!report) throw new Error("No se pudo obtener el reporte.");

      setCurrentReport(report);
      setPropertyId(report.property?.id || "");
      setIncidentId(report.caseType?.id || "");
      setMonitorId(report.contributedBy?.id || "");
      setStartTime(report.incidentStartTime || "");
      setEndTime(report.incidentEndTime || "");
      setDescription(report.reportDetails || "");
      setIsHighPriority(report.priority)
      setImages(
        report.evidences?.map((e) => {
          const path = e.path || e.url || e.filePath || "";
          return path.startsWith("http") ? path : `${BUCKET_URL}${path}`;
        }) || []
      );
      setIncidentLocations(report.incidentLocations || []);
      setFollowings(report.followings || []);
    } catch (err) {
      console.error("Error cargando reporte:", err);
      Alert.alert("Error", "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  // Validar si es edición o nuevo reporte
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          setLoading(true);
          if (id) {
            console.log("Editando reporte:", id);
            setIsEditMode(true);
            await loadReportData(String(id));
          } else {
            console.log("Nuevo reporte");
            setIsEditMode(false);
            resetForm();
          }
        } catch (err) {
          console.error("Error al recargar datos:", err);
        } finally {
          setLoading(false);
        }
      };
      refreshData();
    }, [id])
  );

  // Enviar o actualizar reporte
  const handleSubmit = async () => {
    if (!propertyId || !monitorId || !incidentId || !description) {
      return Alert.alert(
        "Campos faltantes",
        "Por favor, completa todos los campos obligatorios."
      );
    }

    try {
      setSubmitting(true);

      const selectedProperty = properties.find((p) => p?.id === propertyId);
      const payload = {
        property: selectedProperty,
        contributedBy: { id: monitorId },
        caseType: incidents.find((inc) => inc.id === incidentId),
        incidentDate: new Date().toISOString().split("T")[0],
        incidentStartTime: startTime,
        incidentEndTime: endTime,
        reportDetails: description,
        followings,
        priority: isHighPriority && "ALTA",
        incidentLocations,
        evidences: images.map((uri, i) => ({
          uri,
          type: "image/jpeg",
          name: `evidence_${i}.jpg`,
        })),
      };


      let result;
      if (isEditMode && id) {
        result = await ApiService.updateReport(id, payload);
      } else {
        result = await ApiService.createReport(payload);
      }

      if (!result || result.status >= 400) {
        throw new Error("Error al enviar reporte");
      }

      Alert.alert(
        "✅ Éxito",
        isEditMode
          ? "Reporte actualizado correctamente."
          : "Reporte enviado correctamente."
      );

      resetForm();
      setIsEditMode(false);
      router.replace("/");
    } catch (err: any) {
      console.error("Error enviando reporte:", err);
      Alert.alert("❌ Error", err.message || "No se pudo enviar el reporte.");
    } finally {
      setSubmitting(false);
    }
  };

 /* const handleAddEvidence = async () => {
  try {
    // 1️⃣ Seleccionar imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const selectedFiles = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName || `evidence_${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    }));

    // 2️⃣ Enviar al backend
    const reportId = currentReport.id; // el reporte actual


    const updatedReport = await ApiService.addPendingEvidences(reportId, selectedFiles, "1234");

    Alert.alert("Evidencias agregadas", "Las imágenes se añadieron correctamente al reporte.");
    console.log("Reporte actualizado:", updatedReport);

    // 3️⃣ (Opcional) refrescar datos del reporte
    await loadReportData(reportId);
  } catch (error) {
    Alert.alert("Error", "No se pudieron subir las evidencias.");
  }
};*/

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C9A13B" />
        <Text className="mt-3 text-[#C9A13B] font-semibold">
          Cargando datos...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 0 }}
      className="px-3"
    >
      <View key={id || "new"} className="flex-1 bg-gray-50">
        <ImageBackground
          source={require("../../assets/images/gray-background.png")}
          style={{ width: "100%", height: "100%", flex: 1 }}
          imageStyle={{
            position: "absolute",
            top: 0,
            right: -120,
            width: 1200,
            height: "120%",
            resizeMode: "cover",
          }}
        >
          <Header
            title={isEditMode ? "Editar Reporte" : "Crear Reporte"}
            onBack={() => {
              //  resetForm()
           router.replace("/(drawer)")
              //resetForm()
            }}
            icon={isEditMode ? "pencil-outline" : "cloud-upload-outline"}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="px-4 py-6"
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            <PropertyPicker
              label="Property"
              properties={properties}
              selectedId={propertyId}
              onSelect={setPropertyId}
            />

            <MonitorPicker
              label="Monitor"
              monitors={monitors}
              selectedId={monitorId}
              onSelect={setMonitorId}
            />

            <IncidentPicker
              label="Incident Type"
              incidents={incidents}
              selectedId={incidentId}
              onSelect={setIncidentId}
            />

            <View className="mt-2 items-start">
              <TouchableOpacity
                onPress={() => setIsHighPriority(!isHighPriority)}
                className={`px-4 py-2 rounded-full border flex-row items-center ${
                  isHighPriority
                    ? "bg-[#ac2b2b] border-[#C9A13B]"
                    : "bg-white border-[#C9A13B]/40"
                }`}
              >
                <Ionicons
                  name={
                    isHighPriority ? "alert-circle" : "alert-circle-outline"
                  }
                  size={18}
                  color={isHighPriority ? "#fff" : "#C9A13B"}
                  style={{ marginRight: 6 }}
                />

                <Text
                  className={`text-sm font-semibold ${
                    isHighPriority ? "text-white" : "text-[#C9A13B]"
                  }`}
                >
                  {isHighPriority ? "Prioridad Alta" : "Marcar como Prioridad"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <TimePickerInput
                  label="Hora de inicio"
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="Ej: 14:30"
                  icon={
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={20}
                      color="#A67C00"
                    />
                  }
                />
              </View>
              <View className="flex-1">
                <TimePickerInput
                  label="Hora de fin"
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="Ej: 16:00"
                  icon={
                    <MaterialCommunityIcons
                      name="clock-end"
                      size={20}
                      color="#A67C00"
                    />
                  }
                />
              </View>
            </View>
            <CameraFollowingsForm
              followings={followings}
              setFollowings={setFollowings}
            />
            <TextAreaInput
              label="Descripción"
              value={description}
              onChange={setDescription}
              placeholder="Describe brevemente el incidente..."
              icon={
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={22}
                  color="#A67C00"
                />
              }
            />

            <ImageUploader
              label="Evidencias (Imágenes)"
              images={images}
              setImages={setImages}
              onRemoveRemoteImage={async (url) => {
                if (!url || typeof url !== "string") return;
                if (!currentReport || !currentReport.id) return;

                try {
                  const evidence = currentReport.evidences?.find(
                    (e) => `${BUCKET_URL}${e.url || e.path}` === url
                  );
                  if (!evidence) {
                    console.warn(
                      "No se encontró la evidencia correspondiente:",
                      url
                    );
                    return;
                  }

                  console.log("🗑️ Eliminando evidencia:", url);
                  await ApiService.deletePendingEvidence(
                    currentReport.id,
                    evidence
                  );
                  await loadReportData(String(currentReport.id)); // ← vuelve a pedir los datos actualizados
                  // Refrescar datos locales
                  const updatedReport = await ApiService.getReportById(
                    currentReport.id
                  );
                  setCurrentReport(updatedReport);
                  setImages(
                    updatedReport.evidences?.map((e) => {
                      const path = e.path || e.url || "";
                      return path.startsWith("http")
                        ? path
                        : `${BUCKET_URL}${path}`;
                    }) || []
                  );

                  // Mensaje visual de éxito
                  Alert.alert(
                    "Evidencia eliminada",
                    "La evidencia fue eliminada correctamente."
                  );

                  console.log("Evidencia eliminada:", url);
                } catch (err) {
                  console.error("Error eliminando evidencia:", err);
                  Alert.alert(
                    "Error",
                    "No se pudo eliminar la evidencia del servidor."
                  );
                }
              }}
            />

            <IncidentLocationsSelector
              property={properties.find((p) => p.id === propertyId)}
              buildings={buildings} // lista de edificios
              onLocationsChange={setIncidentLocations}
            />
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.9}
              className={`flex-row rounded-2xl py-4  justify-center items-center shadow-lg ${
                submitting ? "bg-[#006bb3]/60" : "bg-[#006bb3]"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isEditMode ? "save-outline" : "send"}
                    size={20}
                    color="white"
                    className="mr-2"
                  />
                  <Text className="text-white font-semibold text-base">
                    {isEditMode ? "Guardar Cambios" : "Enviar Reporte"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </ImageBackground>
      </View>
    </ScrollView>
  );
}
