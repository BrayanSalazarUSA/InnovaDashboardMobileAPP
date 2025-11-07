import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export default function IncidentLocationsSelector({
  property,
  buildings = [],
  onLocationsChange,
  initialLocations = [],
}) {
  const [incidentLocations, setIncidentLocations] = useState(initialLocations);
  const [openBuilding, setOpenBuilding] = useState(false);
  const [openFloor, setOpenFloor] = useState(false);

  const [region, setRegion] = useState({
    latitude: property?.latitude || 33.70615,
    longitude: property?.longitude || -84.3744,
    latitudeDelta: 0.0015,
    longitudeDelta: 0.0015,
  });

  useEffect(() => {
    if (property?.latitude && property?.longitude) {
      setRegion((prev) => ({
        ...prev,
        latitude: property.latitude,
        longitude: property.longitude,
      }));
    }
  }, [property]);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newLoc = {
      id: Date.now(),
      latitude,
      longitude,
      building: null,
      floor: null,
    };
    setIncidentLocations((prev) => [...prev, newLoc]);
  };

  const updateLocation = (id, field, value) => {
    setIncidentLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc))
    );
  };

  const removeLocation = (id) => {
    setIncidentLocations((prev) => prev.filter((l) => l.id !== id));
  };

  useEffect(() => {
    onLocationsChange?.(incidentLocations);
  }, [incidentLocations]);

  useEffect(() => {}, [initialLocations]);
  return (
    <View className="mt-5">
      <Text className="text-xl font-bold text-[#A67C00] mb-1">
        Ubicaciones del incidente
      </Text>
      <Text className="text-sm text-gray-600 mb-4">
        Toca el mapa para agregar puntos de incidente.
      </Text>

      {/* 🗺️ Mapa */}
      <View
        className="rounded-2xl overflow-hidden mb-5"
        style={{
          borderWidth: 1,
          borderColor: "#E7D9A9",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        {Platform.OS === "web" ? (
          // 🌐 Vista para web (evita errores)
          <View
            style={{
              width: "100%",
              height: 300,
              borderWidth: 1,
              borderColor: "#E7D9A9",
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFF9E6",
            }}
          >
            <Image
              source={{
                uri: `https://maps.googleapis.com/maps/api/staticmap?center=${initialRegion.latitude},${initialRegion.longitude}&zoom=18&size=600x300&maptype=satellite`,
              }}
              style={{ width: "100%", height: "100%", borderRadius: 20 }}
              resizeMode="cover"
            />
            <View
              style={{
                position: "absolute",
                backgroundColor: "rgba(0,0,0,0.4)",
                padding: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                El mapa interactivo no está disponible en la versión web
              </Text>
            </View>
          </View>
        ) : (
          // 📱 Vista para Android/iOS
          <View
            style={{ width: "100%", height: 300 }}
            //  provider={PROVIDER_GOOGLE}
            //region={region}
            //onPress={handleMapPress}
            // mapType="hybrid" // ← mapa satelital / realista
          >
            S
          </View>
        )}
      </View>

      {/* 📍 Lista de ubicaciones */}
      <ScrollView className="pb-8">
        {incidentLocations.length === 0 && (
          <Text className="text-center text-gray-500 italic mb-3">
            No hay ubicaciones agregadas todavía.
          </Text>
        )}

        {incidentLocations.map((loc, idx) => {
          const building = buildings.find((b) => b.id === loc.building);
          const floorOptions = Array.from(
            { length: building?.totalFloors || 0 },
            (_, i) => ({ label: `Piso ${i + 1}`, value: i + 1 })
          );

          return (
            <View
              key={loc.id}
              style={{
                backgroundColor: "#FFF9E6",
                borderWidth: 1,
                borderColor: "#E7D9A9",
                borderRadius: 20,
                padding: 14,
                marginBottom: 14,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-[#A67C00] font-semibold">
                  Punto {idx + 1}:{" "}
                  <Text className="text-gray-700">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </Text>
                </Text>
                <TouchableOpacity onPress={() => removeLocation(loc.id)}>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#D9534F"
                  />
                </TouchableOpacity>
              </View>

              <DropDownPicker
                open={openBuilding}
                setOpen={setOpenBuilding}
                value={loc.building}
                setValue={(cb) =>
                  updateLocation(loc.id, "building", cb(loc.building))
                }
                items={buildings.map((b) => ({
                  label: b.name,
                  value: b.id,
                }))}
                placeholder="Selecciona edificio"
                style={{
                  borderColor: "#E7D9A9",
                  backgroundColor: "#FFF",
                  borderRadius: 12,
                }}
                dropDownContainerStyle={{
                  borderColor: "#E7D9A9",
                  backgroundColor: "#FFFDF2",
                }}
              />

              {loc.building && (
                <DropDownPicker
                  open={openFloor}
                  setOpen={setOpenFloor}
                  value={loc.floor}
                  setValue={(cb) =>
                    updateLocation(loc.id, "floor", cb(loc.floor))
                  }
                  items={floorOptions}
                  placeholder="Selecciona piso"
                  style={{
                    marginTop: 10,
                    borderColor: "#E7D9A9",
                    backgroundColor: "#FFF",
                    borderRadius: 12,
                  }}
                  dropDownContainerStyle={{
                    borderColor: "#E7D9A9",
                    backgroundColor: "#FFFDF2",
                  }}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
