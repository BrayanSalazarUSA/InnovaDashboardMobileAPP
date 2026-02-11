import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { ApiService } from "../../../services/api";


const API_URL =
  process.env.EXPO_PUBLIC_SERVER_IP || "http://localhost:8080/api";

type Props = {
  property: any;
  locations: any[];
};

function IncidentLocationsViewer({ property, locations }: Props) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<any>(null);

  // -----------------------------------------
  // 📌 Cargar coordenadas de property si faltan
  // -----------------------------------------
  useEffect(() => {
    if (!property?.id) return;

    if (property.latitude == null || property.longitude == null) {
      loadProperty(property.id);
      return;
    }

    setRegion((prev) => {
      const r = {
        latitude: property.latitude,
        longitude: property.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };

      // Evita reconfigurar mapa si ya está igual
      if (
        prev &&
        prev.latitude === r.latitude &&
        prev.longitude === r.longitude
      ) {
        return prev;
      }

      return r;
    });
  }, [property]);

  function resetToPropertyCenter() {
  if (!region || !mapRef.current) return;

  mapRef.current.animateToRegion(region, 600);
}

  async function loadProperty(id) {
    try {
      const props = await ApiService.getProperties();
      const full = props.find((p) => p.id === id);
      if (!full?.latitude || !full?.longitude) return;

      setRegion({
        latitude: full.latitude,
        longitude: full.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      });
    } catch (e) {
      console.log("❌ Error cargando property", e);
    }
  }

  // -----------------------------------------
  // 📌 Item memoizado (FlatList optimizada)
  // -----------------------------------------
  const renderLocationItem = useCallback(
    ({ item, index }) => {
      const isExterior = !item.building;

      return (
        <View style={styles.locationCardWrapper}>
          <View style={styles.locationLeftSide}>
            <Ionicons
              name="location-sharp"
              size={22}
              color="#1E88E5"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.locationZoneLabel}>Zona #{index + 1}</Text>
          </View>

          <View style={styles.locationRightSide}>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name={isExterior ? "tree" : "office-building"}
                size={18}
                color="#555"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.locationText}>
                {item.building?.name ?? "Zona exterior"}
              </Text>
            </View>

            {item.floor && (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="stairs"
                  size={18}
                  color="#555"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.locationText}>Piso {item.floor}</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    []
  );

  const MemoList = memo(renderLocationItem);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Ubicaciones del incidente</Text>

      {/* MAPA */}
      <View style={{ marginBottom: 10 }}>
          {/* BOTÓN FLOTANTE PARA CENTRAR */}
  {region && (
    <TouchableOpacity
      onPress={resetToPropertyCenter}
      style={styles.centerButton}
    >
  
      <Ionicons name="locate" size={22} color="#333" /> 
    </TouchableOpacity>
  )}
        {region ? (
            <MapView
            ref={mapRef}
            style={{ width: "100%", height: 320 }}
            provider={PROVIDER_GOOGLE}
            region={region} // 👈 Región controlada (zoom fijo)
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={false}
            pitchEnabled={false}
            showsPointsOfInterest={false}
            toolbarEnabled={false}
            minZoomLevel={16}
            maxZoomLevel={20}
            mapType="satellite"
          >
            {locations.map((loc, i) =>
              loc.latitude && loc.longitude ? (
                <Marker
                  key={i}
                  coordinate={{
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }}
                   anchor={{ x: 0.5, y: 0.6 }}   // 👈 Ajusta el “pie” del marker
                >
                  {/* 📌 UNA sola vista para pin + label */}
                  <View style={{ alignItems: "center" }}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={25}
                      color="#FF3D00"
                    />

                    <View style={styles.buildingLabel}>
                      <Text style={styles.buildingLabelText}>
                        {loc.building?.name ?? "Exterior"}
                      </Text>
                    </View>
                  </View>
                </Marker>
              ) : null
            )}
          </MapView>
        ) : (
          <View style={styles.noMap}>
            <Text style={{ color: "#666" }}>
              No hay coordenadas disponibles.
            </Text>
          </View>
        )}
      </View>

      {/* LISTA */}
      <FlatList
      scrollEnabled={false}
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 8 }}
      />
    </View>
  );
}

export default memo(IncidentLocationsViewer);

const styles = StyleSheet.create({
  locationCardWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 7,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
  },

  locationLeftSide: {
    flexDirection: "row",
    alignItems: "center",
    width: 120,
  },

  locationZoneLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  locationRightSide: {
    flex: 1,
    marginLeft: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },

  locationText: {
    fontSize: 14,
    color: "#444",
  },
  title: {
    color: "#A67C00",
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#F2DEA2",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    color: "#A67C00",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
  },
  cardText: { color: "#333", fontSize: 14, marginBottom: 4 },
  coords: { color: "#777", fontSize: 12 },
buildingLabel: {
  backgroundColor: "rgba(0,0,0,0.6)",
  paddingHorizontal: 2,
  paddingVertical: 3,
  borderRadius: 6,
  maxWidth: 400,       // 👈 ancho máximo
},

buildingLabelText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 12,
  flexShrink: 1,       // 👈 permite reducirse si no cabe
  flexWrap: "wrap",    // 👈 permite saltar a otra línea
},

  noMap: {
    width: "100%",
    height: 320,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
   centerButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex:1000,
    backgroundColor: "#A67C00",
    padding: 10,
    borderRadius: 25,
  },
});
