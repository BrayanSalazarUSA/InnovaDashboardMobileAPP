import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Header from "../components/common/Header";
import IncidentLocationsSelector from "../components/ui/IncidentLocationsSelector";

import CameraFollowings from "../components/ui/CamerasFollowing";
import ImageUploader from "../components/ui/ImageUploader";
import IncidentPicker from "../components/ui/IncidentPicker";
import MonitorPicker from "../components/ui/MonitorPicker";
import PropertyPicker from "../components/ui/PropertyPicker";
import TextAreaInput from "../components/ui/TextAreaInput";

import { ApiService } from "../services/api"; // Ajusta la ruta según tu estructura
import TimePickerInput from "../components/ui/TimePickerInput";


export default function NewReport() {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [monitorId, setMonitorId] = useState("");
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [incidentLocations, setIncidentLocations] = useState([]);
  const [followings, setFollowings] = useState([
    { camera: "", description: "", time: "" },
  ]);


// Cargar datos iniciales (propiedades, monitores, incidentes)
useEffect(() => {
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [props, mons, incs] = await Promise.all([
        ApiService.getProperties(),
        ApiService.getMonitors(),
        ApiService.getIncidents(),
      ]);

      setProperties(props || []);
      setMonitors(mons || []);
      setIncidents(incs || []);
      console.log(" Datos iniciales cargados correctamente");
    } catch (err) {
      console.error(" Error cargando datos iniciales:", err);
    } finally {
      setLoading(false);
    }
  };

  loadInitialData();
}, []);

// 🔹 Cargar edificios cuando cambia la propiedad seleccionada
useEffect(() => {
  if (!propertyId) {
    setBuildings([]); // Limpia edificios cuando no hay propiedad seleccionada
    return;
  }

  const loadBuildings = async () => {
    try {
      console.log(` Cargando edificios para la propiedad ${propertyId}...`);
      const result = await ApiService.getBuildings(propertyId);

      if (Array.isArray(result) && result.length > 0) {
        setBuildings(result);
        console.log(` ${result.length} edificios cargados`);
      } else {
        setBuildings([]);
        console.log("ℹ Esta propiedad no tiene edificios registrados");
      }
    } catch (err) {
      console.error(` Error cargando edificios de la propiedad ${propertyId}:`, err);
      setBuildings([]); // En caso de error, evita romper la vista
    }
  };

  loadBuildings();
}, [propertyId]);

 

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris]);
    }
  };

   // Enviar reporte
 const handleSubmit = async () => {
  if (!propertyId || !monitorId || !incidentId || !description) {
    return Alert.alert("Missing Information", "Please complete all required fields.");
  }

  try {
    setSubmitting(true);
    let selectedProperty = properties.find((p) => p?.id === propertyId);
    const payload = {
      property: selectedProperty,
      contributedBy: { id: monitorId },
      caseType: { id: incidentId },
      incidentDate: new Date().toISOString().split("T")[0],
      incidentStartTime: startTime,
      incidentEndTime: endTime,
      reportDetails: description,
      incidentLocations, // asegúrate de que esto sea un array o null
      evidences: images.map((uri, i) => ({
        uri,
        type: "image/jpeg",
        name: `evidence_${i}.jpg`,
      })),
    };

 console.log(" Enviando payload final a ApiService.createReport:", payload);

  const result = await ApiService.createReport(payload);

if (!result || result.status >= 400) {
  //console.error(" Error desde servidor:", result);

  // Mensaje más claro y empático para el usuario
  let message =
    "Ocurrió un problema al enviar tu reporte. Por favor, intenta nuevamente en unos minutos.";

  // Personaliza según el código de error si está disponible
  if (result?.status === 500) {
    message = "El servidor tuvo un problema interno. Estamos trabajando para solucionarlo.";
  } else if (result?.status === 400) {
    message = "Algunos datos parecen incompletos o incorrectos. Revisa la información e inténtalo de nuevo.";
  } else if (result?.status === 403) {
    message = "No tienes permisos para realizar esta acción.";
  } else if (result?.status === 404) {
    message = "No se pudo encontrar el recurso solicitado. Intenta nuevamente.";
  } else if (result?.status === 0) {
    message = "No se pudo conectar con el servidor. Verifica tu conexión a Internet.";
  }

  Alert.alert("⚠️ No se pudo enviar el reporte", message);
  return; // No continuar al success
}

  console.log(" Respuesta del servidor:", result);
  Alert.alert("✅ Éxito", "Reporte enviado correctamente.");
  router.back();

} catch (err) {
  console.error(" Error completo al enviar:", err);
  Alert.alert("❌ Error", `Hubo un problema al enviar: ${err.message}`);
} finally {
  setSubmitting(false);
}
};

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C9A13B" />
        <Text className="mt-3 text-[#C9A13B] font-semibold">Loading data...</Text>
      </View>
    );
  }


  return (
    <View className="flex-1 bg-gray-50" 
    >
      
  <ImageBackground
  source={require("../../assets/images/gray-background.png") }
  style={{ width: '100%', height: '100%', flex: 1 }}
  imageStyle={{
    position: 'absolute',
    top: 0,
    right: -120,   // empuja la imagen hacia la derecha (ajusta el valor)
    width: 1200,   // ancho real de la imagen para que pueda desplazarse
    height: '120%',// o un número para controlar la verticalidad
    resizeMode: 'cover'
  }}
>
   <Header title="Crear Reporte " onBack={() => router.back()} icon="cloud-upload-outline" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-4 py-6"
        contentContainerStyle={{ paddingBottom: 50 }}
      >
      

        {/* Property */}
        <PropertyPicker
          label="Property"
          properties={properties}
          selectedId={propertyId}
          onSelect={(v) => setPropertyId(v)}
        />

        <MonitorPicker
          label="Monitor"
          monitors={monitors}
          selectedId={monitorId}
          onSelect={(id) => setMonitorId(id)}
        />
        <IncidentPicker
          label="Incident Type"
          incidents={incidents}
          selectedId={incidentId}
          onSelect={(id) => setIncidentId(id)}
        />

        {/* Times */}
        <View className="mt-4">
          <View className="flex-row gap-3">
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

          {/* Validación simple */}
        </View>

    <CameraFollowings followings={followings} setFollowings={setFollowings} />
        {/* Description */}
        <TextAreaInput
          label="Descripción"
          value={description}
          onChange={setDescription}
          placeholder="Describe brevemente el incidente, lo observado o las acciones tomadas..."
          icon={
            <MaterialCommunityIcons
              name="note-text-outline"
              size={22}
              color="#A67C00"
            />
          }
        />

        {/* Evidences */}
    
<ImageUploader
  label="Evidencias (Imágenes)"
  images={images}
  setImages={setImages}
/>

   {/**<IncidentLocationsSelector
  property={properties.find((p) => p.id === propertyId)}
  buildings={buildings} // lista de edificios
  onLocationsChange={setIncidentLocations}
/> */}

        {/* Submit */}
       <TouchableOpacity
  disabled={submitting}
  onPress={handleSubmit}
  activeOpacity={0.9}
  className={`flex-row rounded-2xl py-4 mb-5 justify-center items-center shadow-lg 
    ${submitting ? "bg-[#006bb3]/60" : "bg-[#006bb3]"}`}
>
  {submitting ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      <Ionicons name="send" size={20} color="white" className="mr-2" />
      <Text className="text-white font-semibold text-base">Enviar Reporte</Text>
    </>
  )}
</TouchableOpacity>
{submitting && (
  <ActivityIndicator
    size="large"
    color="#C9A13B"
    style={{ marginTop: 40 }}
  />
)}

      </ScrollView>
</ImageBackground>

     
    </View>
  );
}
