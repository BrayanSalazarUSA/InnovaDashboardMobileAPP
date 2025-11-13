import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
//import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export default function IncidentLocationsSelector({ property, buildings = [] }) {
  const [incidentLocations, setIncidentLocations] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);

  const [openBuilding, setOpenBuilding] = useState(false);
  const [openFloor, setOpenFloor] = useState(false);

  const mapRef = useRef<MapView>(null);

  const region = {
    latitude: property?.latitude || 33.70615,
    longitude: property?.longitude || -84.3744,
    latitudeDelta: 0.0015,
    longitudeDelta: 0.0015,
  };

  const [currentRegion, setCurrentRegion] = useState(region);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setModalVisible(true);
  };

  const confirmLocation = () => {
    if (!selectedCoords) return;
    const newLoc = {
      id: Date.now(),
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      building: selectedBuilding,
      floor: selectedFloor,
    };
    setIncidentLocations((prev) => [...prev, newLoc]);
    setModalVisible(false);
  };

  const removeLocation = (id) =>
    setIncidentLocations((prev) => prev.filter((l) => l.id !== id));

  const handleCenterMap = () => {
    mapRef.current?.animateToRegion(region, 800);
  };

  c

  return (
    <View>
      <Text style={styles.title}>Ubicaciones del incidente</Text>
      <View>
      {/*   <MapView
          ref={mapRef}
          style={{ width: "100%", height: 320 }}
          provider={PROVIDER_GOOGLE}
          region={currentRegion}
          //onRegionChangeComplete={handleRegionChangeComplete}
          onPress={handleMapPress}
          mapType="hybrid"
          minZoomLevel={16}
          maxZoomLevel={20}
        >
          {incidentLocations.map((loc) => (
            <Marker
              key={loc.id}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              title="Ubicación"
              description={
                loc.building
                  ? `Edificio: ${
                      buildings.find((b) => b.id === loc.building)?.name
                    }${loc.floor ? ` — Piso ${loc.floor}` : ""}`
                  : "Zona exterior"
              }
            />
          ))}
        </MapView>*/}

        {/* Botón flotante para centrar */}
        <TouchableOpacity
          onPress={handleCenterMap}
          style={styles.centerButton}
        >
          <Ionicons name="locate" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal de selección */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="bg-[#fffbe6] rounded-3xl border border-[#F2DEA2] p-5 shadow-lg">
            <Text className="text-[#A67C00] font-bold text-lg mb-4">
              Selecciona ubicación
            </Text>

            {/* Dropdown edificio */}
            <DropDownPicker
              open={openBuilding}
              setOpen={setOpenBuilding}
              value={selectedBuilding}
              setValue={setSelectedBuilding}
              items={[
                { label: "Zona exterior 🌳", value: null },
                ...buildings.map((b) => ({
                  label: `🏢 ${b.name}`,
                  value: b.id,
                })),
              ]}
              placeholder="Selecciona edificio o zona"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
            />

            {/* Dropdown piso */}
            {selectedBuilding && (
              <DropDownPicker
                open={openFloor}
                setOpen={setOpenFloor}
                value={selectedFloor}
                setValue={setSelectedFloor}
                items={Array.from({ length: 3 }, (_, i) => ({
                  label: `Piso ${i + 1}`,
                  value: i + 1,
                }))}
                placeholder="Selecciona piso"
                style={[styles.dropdown, { marginTop: 10 }]}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            )}

            {/* Botones */}
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmLocation}
                className="ml-3 bg-[#A67C00] px-5 py-2 rounded-xl"
              >
                <Text style={styles.confirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lista de ubicaciones */}
      {incidentLocations.map((loc, idx) => (
        <View key={loc.id} style={styles.card}>
          <Text style={styles.cardText}>
            📍 Zona #{idx + 1} —{" "}
            {loc.building
              ? `${buildings.find((b) => b.id === loc.building)?.name}${
                  loc.floor ? ` — Piso ${loc.floor}` : ""
                }`
              : "Zona exterior"}
          </Text>
          <TouchableOpacity onPress={() => removeLocation(loc.id)}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color="#E53E3E"
            />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#A67C00",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
  },
  dropdown: {
    borderColor: "#F2DEA2",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 8,
  },
  dropdownContainer: {
    borderColor: "#F2DEA2",
    backgroundColor: "#FFFDF2",
    borderRadius: 12,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  cancel: {
    color: "#666",
    fontWeight: "600",
  },
  confirm: {
    color: "#fff",
    fontWeight: "600",
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
    marginTop: 10,
  },
  cardText: {
    color: "#333",
    fontWeight: "500",
  },
  centerButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#A67C00",
    borderRadius: 25,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});
