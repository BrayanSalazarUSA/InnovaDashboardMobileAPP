import { ApiService } from "@/app/services/api";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const API_URL = process.env.EXPO_PUBLIC_SERVER_IP || "http://localhost:8080/api";

type Props = {
  property: any;
  locations: any[];
};

export default function IncidentLocationsViewer({ property, locations }: Props) {
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

  // 🔄 Cargar property completa si vienen coordenadas vacías
  useEffect(() => {
    if (!property || !property.id) return;

    if (property.latitude == null || property.longitude == null) {
      loadProperty(property.id);
    }
  }, [property]);

  async function loadProperty(id) {
    try {
      const props = await ApiService.getProperties();
      const full = props.find((p) => p.id === id);

      if (!full?.latitude || !full?.longitude) return;

      setCurrentRegion({
        latitude: full.latitude,
        longitude: full.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      });
    } catch (e) {
      console.log("❌ Error cargando property", e);
    }
  }

  // 🎯 Región inicial cuando sí vienen coords
  useEffect(() => {
    if (!property || property.latitude == null) return;

    // 👌 Zoom más cerrado para evitar desplazamientos del marker
    const region = {
      latitude: property.latitude,
      longitude: property.longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    };

    setCurrentRegion(region);

    setTimeout(() => {
      mapRef.current?.animateToRegion(region, 500);
    }, 300);
  }, [property]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Ubicaciones del incidente</Text>

      {/* 🗺️ MAPA */}
      <View style={{ marginBottom: 10 }}>
        {currentRegion ? (
          <MapView
            ref={mapRef}
            style={{ width: "100%", height: 320 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={currentRegion}
            // 🔥 Zoom habilitado
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={false}
            pitchEnabled={false}
            showsPointsOfInterest={false}
            toolbarEnabled={false}
            mapType="hybrid"
          >
            {/* 📍 Marcadores */}
            {locations.map((loc, i) =>
              loc.latitude && loc.longitude ? (
                <Marker
                  key={`loc-${i}`}
                  coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                  title={loc.building?.name ?? "Zona exterior"}
                  description={loc.floor ? `Piso ${loc.floor}` : undefined}
                />
              ) : null
            )}

            {/* 🏢 Labels */}
            {locations.map((loc, i) =>
              loc.latitude && loc.longitude ? (
                <Marker
                  key={`label-${i}`}
                  coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                  anchor={{ x: 0.5, y: 1.4 }}
                >
                  <View style={styles.buildingLabel}>
                    <Text numberOfLines={1} style={styles.buildingLabelText}>
                      {loc.building?.name ?? "Exterior"}
                    </Text>
                  </View>
                </Marker>
              ) : null
            )}
          </MapView>
        ) : (
          <View style={styles.noMap}>
            <Text style={{ color: "#666" }}>No hay coordenadas disponibles.</Text>
          </View>
        )}
      </View>

      {/* 🧾 LISTA */}
      <FlatList
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 20 }}
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Zona #{index + 1}</Text>
            <Text style={styles.cardText}>
              {item.building?.name ?? "Zona exterior"}{" "}
              {item.floor ? `• Piso ${item.floor}` : ""}
            </Text>
            <Text style={styles.coords}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardText: {
    color: "#333",
    fontSize: 14,
    marginBottom: 4,
  },
  coords: {
    color: "#777",
    fontSize: 12,
  },
  buildingLabel: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  buildingLabelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  noMap: {
    width: "100%",
    height: 320,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
});