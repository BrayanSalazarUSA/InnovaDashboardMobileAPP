import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import LocationSelectionModal from "./LocationSelectionModal";

type Props = {
  property: any;
  buildings?: any[];
  onLocationsChange?: (locations: any[]) => void;
};

export default function IncidentLocationsSelector({
  property,
  buildings = [],
  onLocationsChange,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const [incidentLocations, setIncidentLocations] = useState<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [selectedFloor, setSelectedFloor] = useState<any>(null);

  const [openBuilding, setOpenBuilding] = useState(false);
  const [openFloor, setOpenFloor] = useState(false);
  const [buildingItems, setBuildingItems] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

useEffect(() => {
  if (property == null) {
    setIncidentLocations([]);
  }
}, [property]);

  // Crea lista de edificios
  useEffect(() => {
    const items = [
      { label: "Zona exterior", value: null },
      ...buildings.map((b) => ({
        label: `🏢 ${b.name}`,
        value: b.id,
      })),
    ];
    setBuildingItems(items);
  }, [buildings]);

  const filteredBuildings = buildingItems.filter((b) =>
    b.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // Inicializa el mapa
  useEffect(() => {
    if (!property?.latitude || !property?.longitude) {
      setCurrentRegion(null);
      return;
    }

    const zoom = property.zoom ? property.zoom : 17;

    const region = {
      latitude: property.latitude,
      longitude: property.longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    };

    setCurrentRegion(region);

    setTimeout(() => {
      mapRef.current?.animateToRegion(region, 400);
    }, 300);
  }, [property]);

  // 🔸 Notifica cambios al padre
  useEffect(() => {
    onLocationsChange?.(incidentLocations);
  }, [incidentLocations]);

  // 🔸 Click en el mapa
  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });

    // Cierra dropdowns para que no intercepten toques
    setOpenBuilding(false);
    setOpenFloor(false);

    // Micro-delay para asegurar que el estado anterior se compromete antes de abrir el modal
    setTimeout(() => {
      setModalVisible(true);
    }, 0);
  };

  // 🔸 Confirmar ubicación
  const confirmLocation = () => {
    if (!selectedCoords) return;

    const newLoc = {
      id: Date.now(), // ← ESTE FIX ES CLAVE
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      building: selectedBuilding === null ? null : { id: selectedBuilding },
      floor: selectedFloor,
    };

    setIncidentLocations((prev) => [...prev, newLoc]);
    setModalVisible(false);
  };

  const removeLocation = (id: number) => {
    setIncidentLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCenterMap = () => {
    if (currentRegion) {
      mapRef.current?.animateToRegion(currentRegion, 400);
    }
  };

  const CLEAN_MAP_STYLE = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    stylers: [{ visibility: "off" }],
  },
];
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Ubicaciones del incidente</Text>

        {/* 🗺️ MAPA */}
        <View style={{ marginBottom: 20 }}>
          {currentRegion ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{ width: "100%", height: 320, flex: 1 }}
              initialRegion={currentRegion}
              onPress={handleMapPress}
              showsPointsOfInterest={false}
              toolbarEnabled={false}
              mapType="satellite"
              zoomEnabled={true}
              minZoomLevel={16}
              maxZoomLevel={20}
              //liteMode={false}
            >
              {/* Marcadores del incidente */}
              {incidentLocations.map((loc) => (
                <Marker
                  key={loc.id}
                  coordinate={{
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }}
                  title="Ubicación"
                  description={
                    loc.building
                      ? `Edificio: ${
                          buildings.find((b) => b.id === loc.building?.id)?.name
                        }${loc.floor ? ` — Piso ${loc.floor}` : ""}`
                      : "Zona exterior"
                  }
                />
              ))}

              {/* Marcadores de edificios */}
              {buildings.map(
                (b) =>
                  b.lat &&
                  b.lon && (
                    <Marker
                      key={`building-${b.id}`}
                      coordinate={{ latitude: b.lat, longitude: b.lon }}
                      anchor={{ x: 0.4, y: 0.22 }}
                    >
                      <View style={styles.buildingLabel}>
                        <Text
                          numberOfLines={1}
                          style={styles.buildingLabelText}
                        >
                          {b.name}
                        </Text>
                      </View>
                    </Marker>
                  )
              )}
            </MapView>
          ) : (
            <View style={styles.noMap}>
              <MaterialCommunityIcons
                name="map-marker-off"
                size={48}
                color="#999"
              />
              <Text style={styles.noMapTitle}>Sin coordenadas</Text>
              <Text style={styles.noMapSubtitle}>
                Esta propiedad aún no tiene ubicación configurada.
              </Text>
            </View>
          )}

          {currentRegion && (
            <TouchableOpacity
              onPress={handleCenterMap}
              style={styles.centerButton}
            >
              <Ionicons name="locate" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* 📌 LISTA DE UBICACIONES */}
        <FlatList
          scrollEnabled={false}
          style={{ maxHeight: 250, marginBottom: 20 }}
          data={incidentLocations}
          keyExtractor={(item) => item.id.toString()} // ← FIX IMPORTANTE
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                📍 Zona #{index + 1} — {" "}
                {item.building
                  ? `${buildings.find((b) => b.id === item.building.id)?.name}${
                      item.floor ? ` — Piso ${item.floor}` : ""
                    }`
                  : "Zona exterior"}
              </Text>

              <TouchableOpacity onPress={() => removeLocation(item.id)}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#E53E3E"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {/* MODAL */}
        <LocationSelectionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          searchText={searchText}
          setSearchText={setSearchText}
          openBuilding={openBuilding}
          setOpenBuilding={setOpenBuilding}
          selectedBuilding={selectedBuilding}
          setSelectedBuilding={setSelectedBuilding}
          filteredBuildings={filteredBuildings}
          openFloor={openFloor}
          setOpenFloor={setOpenFloor}
          selectedFloor={selectedFloor}
          setSelectedFloor={setSelectedFloor}
          confirmLocation={confirmLocation}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#A67C00",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#F2DEA2",
    borderRadius: 16,
    padding: 10,
    marginTop: 6,
  },
  cardText: {
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  buildingLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  buildingLabelText: {
    color: "orange",
    fontWeight: "bold",
    fontSize: 12,
  },
  centerButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#A67C00",
    padding: 10,
    borderRadius: 25,
  },
  noMap: {
    width: "100%",
    height: 160,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  noMapTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginBottom: 4,
  },

  noMapSubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 20,
  },
});
