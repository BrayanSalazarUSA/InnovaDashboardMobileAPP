import { DraftService } from "@/services/DraftService";
import { LocalDraftReport } from "@/types/LocalDraftReport";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Switch } from "react-native-gesture-handler";
import { ApiService } from "../../services/api";
import { recordDiagnostic } from "../../utils/diagnostics";
import Header from "../components/common/Header";
import CameraFollowingsForm from "../components/ui/CamerasFollowingForm";
import ImageUploader from "../components/ui/ImageUploader";
import IncidentLocationsSelector from "../components/ui/IncidentLocationsSelector";
import IncidentPicker from "../components/ui/IncidentPicker";
import MonitorPicker from "../components/ui/MonitorPicker";
import PropertyPicker from "../components/ui/PropertyPicker";
import TextAreaInput from "../components/ui/TextAreaInput";
import TimePickerInput from "../components/ui/TimePickerInput";
const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET;

function normalizeId(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

export type ReportImage = {
  id?: number;
  path?: string;
  uri: string;
  type?: string;
  name?: string;
  isRemote: boolean; // 👈 clave
};

export default function NewReport() {
  const router = useRouter();
  const { id, draftId } = useLocalSearchParams<{
    id?: string;
    draftId?: string;
  }>();

  /* =========================
     MODOS
  ========================== */
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  /* =========================
     ESTADOS
  ========================== */
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [monitorId, setMonitorId] = useState("");
  const [incidentLocations, setIncidentLocations] = useState<any[]>([]);
  const [followings, setFollowings] = useState<any[]>([]);
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [policeFirstResponderNotified, setPoliceFirstResponderNotified] =
    useState(false);
  const [policeFirstResponderScene, setPoliceFirstResponderScene] =
    useState("");
  const [properties, setProperties] = useState<any[]>([]);
  const [buildings] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  const [images, setImages] = useState<ReportImage[]>([]);

  const scrollRef = useRef<ScrollView>(null);

  const hasMeaningfulChanges = useCallback(() => {
    return (
      propertyId !== "" ||
      incidentId !== "" ||
      startTime !== "" ||
      endTime !== "" ||
      description.trim().length > 0 ||
      images.length > 0 ||
      incidentLocations.length > 0 ||
      followings.length > 0 ||
      isHighPriority === true ||
      policeFirstResponderNotified === true ||
      policeFirstResponderScene !== ""
    );
  }, [
    propertyId,
    incidentId,
    startTime,
    endTime,
    description,
    images,
    incidentLocations,
    followings,
    isHighPriority,
    policeFirstResponderNotified,
    policeFirstResponderScene,
  ]);

  /* =========================
     RESET
  ========================== */
  const resetForm = () => {
    setPropertyId("");
    setIncidentId("");
    setStartTime("");
    setEndTime("");
    setDescription("");
    setImages([]);
    setMonitorId("");
    setIncidentLocations([]);
    setFollowings([]);
    setIsHighPriority(false);
    setPoliceFirstResponderNotified(false);
    setPoliceFirstResponderScene("");
  };

  useEffect(() => {
    // 🚫 NUNCA crear drafts en modo edición
    if (isEditMode) return;

    // ❌ Nada que guardar
    if (!hasMeaningfulChanges()) return;

    // 🟢 Primer cambio → crear draft
    if (!currentDraftId) {
      const newDraftId = Crypto.randomUUID();
      setIsDraftMode(true);
      setCurrentDraftId(newDraftId);
      return;
    }

    // 🟡 Guardar draft existente
    const save = async () => {
      const selectedProperty = properties.find((p) => p.id === propertyId);
      const selectedIncident = incidents.find((i) => i.id === incidentId);
      const selectedMonitor = monitors.find((m) => m.id === monitorId);

      const draft: LocalDraftReport = {
        localId: currentDraftId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        propertyId,
        incidentId,
        monitorId,

        propertyName: selectedProperty?.name || "",
        incidentLabel:
          selectedIncident?.translate || selectedIncident?.incident || "",
        monitorName: selectedMonitor?.name || "",

        startTime,
        endTime,
        description,
        images,
        incidentLocations,
        followings,
        isHighPriority,
        policeFirstResponderNotified,
        policeFirstResponderScene,

        status: "draft",
      };

      await DraftService.save(draft);
    };

    save();
  }, [
    isEditMode, // 👈 IMPORTANTE
    propertyId,
    incidentId,
    startTime,
    endTime,
    description,
    images,
    incidentLocations,
    followings,
    isHighPriority,
    policeFirstResponderNotified,
    policeFirstResponderScene,
    currentDraftId,
    hasMeaningfulChanges,
    incidents,
    monitorId,
    monitors,
    properties,
  ]);

  /* =========================
     CARGA INICIAL (3 MODOS)
  ========================== */
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          setLoading(true);

          // 🔵 EDICIÓN DESDE BACKEND
          if (id) {
            setIsEditMode(true);
            setIsDraftMode(false);
            setCurrentDraftId(null);

            await loadBackendReport(id);
            return;
          }

          // 🟡 CONTINUAR DRAFT EXISTENTE
          if (draftId) {
            const draft = await DraftService.getById(draftId);

            if (draft) {
              setIsEditMode(false);
              setIsDraftMode(true);
              setCurrentDraftId(draft.localId);

              hydrateFromDraft(draft);
            }

            return;
          }

          // 🟢 NUEVO REPORTE (VACÍO, SIN DRAFT AÚN)
          setIsEditMode(false);
          setIsDraftMode(false);
          setCurrentDraftId(null);

          resetForm();
        } catch (error) {
          console.error("Error inicializando formulario:", error);
        } finally {
          setLoading(false);
        }
      };

      init();
    }, [id, draftId]),
  );

  /* =========================
     AUTOGUARDADO DRAFT
===================
     CATÁLOGOS
  ========================== */
  useFocusEffect(
    useCallback(() => {
      const loadCatalogs = async () => {
        const results = await Promise.allSettled([
          ApiService.getProperties(),
          ApiService.getMonitors(),
          ApiService.getIncidents(),
        ]);

        const [propsResult, monitorsResult, incidentsResult] = results;
        const failedCatalogs: string[] = [];

        if (propsResult.status === "fulfilled") {
          setProperties(propsResult.value || []);
        } else {
          setProperties([]);
          failedCatalogs.push("propiedades");
          recordDiagnostic({
            source: "newReport.loadCatalogs.properties",
            message: "No se pudo cargar el catalogo de propiedades.",
            error: propsResult.reason,
          });
        }

        if (monitorsResult.status === "fulfilled") {
          setMonitors(monitorsResult.value || []);
        } else {
          setMonitors([]);
          failedCatalogs.push("monitores");
          recordDiagnostic({
            source: "newReport.loadCatalogs.monitors",
            message: "No se pudo cargar el catalogo de monitores.",
            error: monitorsResult.reason,
          });
        }

        if (incidentsResult.status === "fulfilled") {
          setIncidents(incidentsResult.value || []);
        } else {
          setIncidents([]);
          failedCatalogs.push("tipos de incidente");
          recordDiagnostic({
            source: "newReport.loadCatalogs.incidents",
            message: "No se pudo cargar el catalogo de incidentes.",
            error: incidentsResult.reason,
          });
        }

        if (failedCatalogs.length > 0) {
          Alert.alert(
            "Conexion inestable",
            `No se pudieron cargar: ${failedCatalogs.join(", ")}. Puedes intentar de nuevo entrando otra vez a esta pantalla.`,
          );
        }
      };
      void loadCatalogs();
    }, []),
  );

  /* =========================
     LOADERS
  ========================== */
  const hydrateFromDraft = (draft: LocalDraftReport) => {
    setPropertyId(draft.propertyId || "");
    setIncidentId(draft.incidentId || "");
    setMonitorId(draft.monitorId || "");

    setStartTime(draft.startTime || "");
    setEndTime(draft.endTime || "");
    setDescription(draft.description || "");
    setImages(draft.images || []);
    setIncidentLocations(draft.incidentLocations || []);
    setFollowings(draft.followings || []);
    setIsHighPriority(draft.isHighPriority || false);
    setPoliceFirstResponderNotified(
      draft.policeFirstResponderNotified || false,
    );
    setPoliceFirstResponderScene(draft.policeFirstResponderScene || "");
  };

  const loadBackendReport = async (reportId: string) => {
    const report = await ApiService.getReportById(reportId);

    setPropertyId(report.property?.id || "");
    setIncidentId(report.caseType?.id || "");
    setMonitorId(report.contributedBy?.id || "");
    setStartTime(report.incidentStartTime || "");
    setEndTime(report.incidentEndTime || "");
    setDescription(report.reportDetails || "");
    setIsHighPriority(report.priority === "ALTA");
    setPoliceFirstResponderNotified(
      report.policeFirstResponderNotified === true,
    );
    setPoliceFirstResponderScene(report.policeFirstResponderScene || "");
    setImages(
      report.evidences
        ?.filter((e) => e.path || e.url)
        .map((e) => {
          const path = e.url || e.path;
          return {
            id: e.id,
            path,
            uri: path.startsWith("http") ? path : `${BUCKET_URL}${path}`,
            isRemote: true,
          };
        }) || [],
    );
    setIncidentLocations(report.incidentLocations || []);
    setFollowings(report.followings || []);
  };

  /* =========================
     SUBMIT
  ========================== */
  const handleSubmit = async () => {
    if (policeFirstResponderNotified && !policeFirstResponderScene) {
      Alert.alert(
        "Información requerida",
        "Selecciona si la policía llegó al lugar o si no llegó antes de enviar el reporte.",
      );
      return;
    }

    try {
      setSubmitting(true);

      // 🟢 Imágenes nuevas (locales)
      const newImages = images.filter((img) => !img.isRemote);
      const selectedProperty = properties.find((p) => p.id === propertyId);
      const selectedIncident = incidents.find((i) => String(i.id) === String(incidentId));
      const selectedMonitor = monitors.find((m) => String(m.id) === String(monitorId));
      const safePriority = isHighPriority ? "ALTA" : null;

      // ==========================
      // 🟢 CREAR REPORTE NUEVO
      // ==========================
      if (!isEditMode) {
        const payload = {
          property: selectedProperty,
          contributedBy: selectedMonitor
            ? { ...selectedMonitor, id: normalizeId(selectedMonitor.id) }
            : { id: normalizeId(monitorId) },
          caseType: selectedIncident,
          incidentStartTime: startTime,
          incidentEndTime: endTime,
          reportDetails: description,
          followings,
          priority: safePriority,
          policeFirstResponderNotified,
          policeFirstResponderScene: policeFirstResponderNotified
            ? policeFirstResponderScene
            : null,
          incidentLocations,

          // 🔥 AQUÍ ESTABA EL PROBLEMA
          evidences: newImages.map((img, i) => ({
            uri: img.uri,
            type: img.type || "image/jpeg",
            name: img.name || `evidence_${i}.jpg`,
          })),
        };

        const result = await ApiService.createReport(payload);
        if (result?.failedEvidenceCount > 0) {
          Alert.alert(
            "Reporte guardado",
            `El reporte quedo creado, pero ${result.failedEvidenceCount} evidencia(s) no se pudieron subir. Puedes editar el reporte e intentar agregarlas de nuevo.`,
          );
        }
      }

      // ==========================
      // ✏️ EDITAR REPORTE EXISTENTE
      // ==========================
      if (isEditMode && id) {
        // 1️⃣ Actualizar datos del reporte
        await ApiService.updateReport(id, {
          property: selectedProperty,
          contributedBy: selectedMonitor
            ? { ...selectedMonitor, id: normalizeId(selectedMonitor.id) }
            : { id: normalizeId(monitorId) },
          caseType: selectedIncident,
          incidentStartTime: startTime,
          incidentEndTime: endTime,
          reportDetails: description,
          followings,
          priority: safePriority,
          policeFirstResponderNotified,
          policeFirstResponderScene: policeFirstResponderNotified
            ? policeFirstResponderScene
            : null,
          incidentLocations,
        }, normalizeId(monitorId));

        // 2️⃣ Subir SOLO imágenes nuevas
        if (newImages.length > 0) {
          const failedEvidenceCount =
            await ApiService.uploadPendingEvidencesSafely(
              id,
              newImages.map((img, index) => ({
                uri: img.uri,
                type: img.type || "image/jpeg",
                name: img.name || `evidence_${index}.jpg`,
              })),
              monitorId,
            );

          if (failedEvidenceCount > 0) {
            Alert.alert(
              "Reporte actualizado",
              `${failedEvidenceCount} evidencia(s) no se pudieron subir. El resto del reporte quedo guardado.`,
            );
          }
        }
      }

      // 🧹 Limpiar draft
      if (currentDraftId) {
        await DraftService.delete(currentDraftId);
      }

      resetForm();
      router.replace("/(drawer)");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo enviar el reporte");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     UI
  ========================== */
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#C9A13B" />
      </View>
    );
  }
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ paddingBottom: 0 }}
      className="px-3"
    >
      <View className="flex-1 bg-gray-50">
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
            title={
              isEditMode
                ? "Editar Reporte"
                : isDraftMode
                  ? "Continuar Reporte"
                  : "Crear Reporte"
            }
            onBack={() => router.replace("/(drawer)")}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="px-4 py-6"
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* ========================
              PROPERTY
          ======================== */}
            <PropertyPicker
              label="Property"
              properties={properties}
              selectedId={propertyId}
              onSelect={setPropertyId}
            />

            {/* ========================
              MONITOR
          ======================== */}
            <MonitorPicker
              label="Monitor"
              monitors={monitors}
              selectedId={monitorId}
              onSelect={setMonitorId}
            />

            {/* ========================
              INCIDENT
          ======================== */}
            <IncidentPicker
              label="Incident Type"
              incidents={incidents}
              selectedId={incidentId}
              onSelect={setIncidentId}
            />

            {/* ========================
              PRIORIDAD
          ======================== */}
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

            {/* ========================
              POLICIA
          ======================== */}
            <View className="mt-5">
              <Text className="font-semibold text-[#A67C00] mb-1">
                ¿Se llamó a la policía?
              </Text>

              <View
                className="border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-3 mb-4"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={20}
                      color="#A67C00"
                    />

                    <Text className="ml-2 text-base text-gray-800 font-medium">
                      Notificación policial
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Text
                      className={`mr-2 font-medium ${
                        policeFirstResponderNotified
                          ? "text-[#A67C00]"
                          : "text-gray-500"
                      }`}
                    >
                      {policeFirstResponderNotified ? "Sí" : "No"}
                    </Text>

                    <Switch
                      value={policeFirstResponderNotified}
                      onValueChange={(value) => {
                        setPoliceFirstResponderNotified(value);

                        if (!value) {
                          setPoliceFirstResponderScene("");
                        }
                      }}
                      trackColor={{
                        false: "#D9D9D9",
                        true: "#D9C27A",
                      }}
                      thumbColor={
                        policeFirstResponderNotified ? "#A67C00" : "#FFFFFF"
                      }
                    />
                  </View>
                </View>

                {policeFirstResponderNotified && (
                  <View className="mt-4 pt-3 border-t border-[#F2DEA2]">
                    <Text className="text-sm font-medium text-[#6A5F3B] mb-3">
                      ¿La policía llegó al lugar?
                    </Text>

                    <View className="flex-row gap-2">
                      {[
                        { value: "Yes", label: "Llegaron" },
                        { value: "No", label: "No llegaron" },
                      ].map((option) => {
                        const selected =
                          policeFirstResponderScene === option.value;

                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() =>
                              setPoliceFirstResponderScene(option.value)
                            }
                            className={`flex-1 py-3 rounded-xl border flex-row justify-center items-center ${
                              selected
                                ? "bg-[#EFF6FF] border-[#0A6BB8]"
                                : "bg-white border-[#F2DEA2]"
                            }`}
                          >
                            <Text
                              className={`font-medium ${
                                selected ? "text-[#0A6BB8]" : "text-gray-700"
                              }`}
                            >
                              {option.label}
                            </Text>

                            {selected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#0A6BB8"
                                style={{ marginLeft: 6 }}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </View>
            {/* ========================
              HORAS
          ======================== */}
            <View className="mt-1 flex-row gap-3">
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

            {/* ========================
              FOLLOWINGS
          ======================== */}
            <CameraFollowingsForm
              followings={followings}
              setFollowings={setFollowings}
            />

            {/* ========================
              DESCRIPCIÓN
          ======================== */}
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

            {/* ========================
              IMÁGENES
          ======================== */}

            <ImageUploader
              key={images.map((i) => i.uri).join("|")}
              label="Evidencias"
              images={images}
              setImages={setImages}
              maxImages={10}
              onRemoveRemoteImage={async (image) => {
                await ApiService.deletePendingEvidence(id!, {
                  id: image.id,
                  path: image.path || image.uri.replace(BUCKET_URL, ""),
                }, normalizeId(monitorId));
              }}
            />
            {/* ========================
              UBICACIONES
          ======================== */}
            {!isEditMode && (
              <IncidentLocationsSelector
                property={properties.find((p) => p.id === propertyId)}
                buildings={buildings}
                onLocationsChange={setIncidentLocations}
              />
            )}

            {/* ========================
              SUBMIT
          ======================== */}
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.9}
              className={`flex-row rounded-2xl py-4 justify-center items-center shadow-lg ${
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
                    style={{ marginRight: 8 }}
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
