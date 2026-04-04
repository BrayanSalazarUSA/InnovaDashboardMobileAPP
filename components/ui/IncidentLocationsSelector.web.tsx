import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type LocationItem = {
  id: number;
  latitude: number | null;
  longitude: number | null;
  building: { id?: number; name?: string } | null;
  floor: number | null;
};

type Props = {
  property: any;
  buildings?: any[];
  onLocationsChange?: (locations: LocationItem[]) => void;
};

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBuildingLatitude(building: any) {
  return normalizeNumber(building?.lat ?? building?.latitude);
}

function getBuildingLongitude(building: any) {
  return normalizeNumber(building?.lon ?? building?.longitude);
}

export default function IncidentLocationsSelectorWeb({
  property,
  buildings = [],
  onLocationsChange,
}: Props) {
  const [incidentLocations, setIncidentLocations] = useState<LocationItem[]>([]);

  useEffect(() => {
    if (property == null) {
      setIncidentLocations([]);
    }
  }, [property]);

  useEffect(() => {
    onLocationsChange?.(incidentLocations);
  }, [incidentLocations, onLocationsChange]);

  const propertyCoordinates = useMemo(
    () => ({
      latitude: normalizeNumber(property?.latitude),
      longitude: normalizeNumber(property?.longitude),
    }),
    [property],
  );

  const addExteriorLocation = () => {
    setIncidentLocations((prev) => [
      ...prev,
      {
        id: Date.now(),
        latitude: propertyCoordinates.latitude,
        longitude: propertyCoordinates.longitude,
        building: null,
        floor: null,
      },
    ]);
  };

  const addBuildingLocation = (building: any) => {
    setIncidentLocations((prev) => [
      ...prev,
      {
        id: Date.now() + building.id,
        latitude: getBuildingLatitude(building) ?? propertyCoordinates.latitude,
        longitude: getBuildingLongitude(building) ?? propertyCoordinates.longitude,
        building: {
          id: building.id,
          name: building.name,
        },
        floor: null,
      },
    ]);
  };

  const removeLocation = (id: number) => {
    setIncidentLocations((prev) => prev.filter((location) => location.id !== id));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ubicaciones del incidente</Text>

      <View style={styles.noticeCard}>
        <MaterialCommunityIcons name="map-off-outline" size={28} color="#A67C00" />
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>Vista simplificada en navegador</Text>
          <Text style={styles.noticeText}>
            El mapa satelital no está disponible en web en esta build. Puedes
            seguir probando el formulario y agregar ubicaciones rápidas aquí.
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={addExteriorLocation} style={styles.primaryButton}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Agregar zona exterior</Text>
        </Pressable>
      </View>

      {buildings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edificios de la propiedad</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {buildings.map((building) => (
              <Pressable
                key={building.id}
                onPress={() => addBuildingLocation(building)}
                style={styles.chip}
              >
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={16}
                  color="#7A5D00"
                />
                <Text style={styles.chipText}>{building.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicaciones agregadas</Text>

        {incidentLocations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-marker-plus-outline" size={34} color="#B7B7B7" />
            <Text style={styles.emptyTitle}>Aún no hay ubicaciones</Text>
            <Text style={styles.emptyText}>
              En web puedes agregar una zona exterior o tomar un edificio como
              referencia rápida.
            </Text>
          </View>
        ) : (
          incidentLocations.map((location, index) => (
            <View key={location.id} style={styles.locationCard}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Zona #{index + 1}</Text>
                <Text style={styles.locationText}>
                  {location.building?.name ?? "Zona exterior"}
                </Text>
                <Text style={styles.locationMeta}>
                  {location.latitude != null && location.longitude != null
                    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                    : "Sin coordenadas disponibles"}
                </Text>
              </View>

              <Pressable
                onPress={() => removeLocation(location.id)}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#C0392B"
                />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  title: {
    color: "#A67C00",
    fontWeight: "bold",
    fontSize: 20,
  },
  noticeCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#F2DEA2",
    alignItems: "flex-start",
  },
  noticeContent: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6D5200",
  },
  noticeText: {
    fontSize: 14,
    color: "#6B6B6B",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#A67C00",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A4A4A",
  },
  chipsContainer: {
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF4CC",
    borderWidth: 1,
    borderColor: "#E6C96B",
  },
  chipText: {
    color: "#7A5D00",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  emptyTitle: {
    fontWeight: "700",
    color: "#555",
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    lineHeight: 20,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  locationText: {
    fontSize: 14,
    color: "#555",
  },
  locationMeta: {
    fontSize: 13,
    color: "#888",
  },
  deleteButton: {
    padding: 8,
  },
});
