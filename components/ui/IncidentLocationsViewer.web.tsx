import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  property: any;
  locations: any[];
};

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function IncidentLocationsViewerWeb({ property, locations }: Props) {
  const propertyLabel = property?.name ?? "propiedad";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ubicaciones del incidente</Text>

      <View style={styles.noticeCard}>
        <MaterialCommunityIcons name="monitor-eye" size={28} color="#A67C00" />
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>Mapa no disponible en web</Text>
          <Text style={styles.noticeText}>
            La vista detallada del mapa sigue disponible en móvil. En navegador
            te mostramos las ubicaciones registradas para {propertyLabel}.
          </Text>
        </View>
      </View>

      {locations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={34} color="#B7B7B7" />
          <Text style={styles.emptyTitle}>No hay ubicaciones registradas</Text>
          <Text style={styles.emptyText}>
            Cuando el reporte tenga puntos guardados, aparecerán aquí.
          </Text>
        </View>
      ) : (
        locations.map((location, index) => {
          const latitude = Number(location?.latitude);
          const longitude = Number(location?.longitude);
          const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

          return (
            <View key={location.id ?? `${latitude}-${longitude}-${index}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.zoneBadge}>
                  <Text style={styles.zoneBadgeText}>Zona #{index + 1}</Text>
                </View>
                {location.floor ? (
                  <Text style={styles.floorText}>Piso {location.floor}</Text>
                ) : null}
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name={location.building ? "office-building-outline" : "pine-tree"}
                  size={18}
                  color="#666"
                />
                <Text style={styles.infoText}>
                  {location.building?.name ?? "Zona exterior"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={18} color="#666" />
                <Text style={styles.infoText}>
                  {hasCoordinates
                    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    : "Sin coordenadas disponibles"}
                </Text>
              </View>

              {hasCoordinates ? (
                <Pressable
                  onPress={() => Linking.openURL(buildGoogleMapsUrl(latitude, longitude))}
                  style={styles.linkButton}
                >
                  <Ionicons name="open-outline" size={16} color="#1E88E5" />
                  <Text style={styles.linkButtonText}>Abrir en Google Maps</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

export default memo(IncidentLocationsViewerWeb);

const styles = StyleSheet.create({
  container: {
    gap: 12,
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
  card: {
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneBadge: {
    backgroundColor: "#FFF4CC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneBadgeText: {
    color: "#7A5D00",
    fontWeight: "700",
  },
  floorText: {
    color: "#666",
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    color: "#4C4C4C",
  },
  linkButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  linkButtonText: {
    color: "#1E88E5",
    fontWeight: "700",
  },
});
