import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "../../global.css";
import ReportItem from "../components/common/ReportItem";
import Button from "../components/ui/Button";

const apiUrl = process.env.EXPO_PUBLIC_SERVER_IP;

export default function HomeScreen() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(null);
  const router = useRouter();

  // 🔹 Filtrado de reportes
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch = (r.title || "")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesDate = dateFilter ? r.incidentDate === dateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [reports, search, dateFilter]);

  // 🔹 Función para cargar los reportes (la usaremos en dos partes)
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/pending-reports`);
      const data = await res.json();
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Se ejecuta cada vez que vuelves a esta pantalla
  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [])
  );

  const navigateToDetails = (id) => router.push(`/report/${id}`);

  return (
    <View className="flex-1 bg-[#F9F7F1] p-4">
      {/* Buscador */}
      <View className="flex-row items-center bg-white rounded-xl px-4 py-1 shadow mb-4">
        <Ionicons
          name="search"
          size={20}
          color="#8A6E28"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Buscar reportes..."
          value={search}
          onChangeText={setSearch}
          className="flex-1 text-gray-800"
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#C9A13B"
          style={{ marginTop: 40 }}
        />
      ) : (
        <>
          {/* HEADER CON FILTRO */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1C1C1C] font-semibold text-lg">
              Reportes Pendientes ({filteredReports.length})
            </Text>

            <TouchableOpacity
              onPress={() => {
                // Ejemplo temporal de filtro de fecha
                setDateFilter(dateFilter ? null : "2025-11-06");
              }}
              className="flex-row items-center px-3 py-2 rounded-xl border border-[#C9A13B] bg-white"
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color="#C9A13B" />
              <Text className="text-[#A67C00] ml-2 font-medium">
                {dateFilter ? dateFilter : "Filtrar Fecha"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🔹 LISTA CON REFRESH */}
          <FlatList
            data={filteredReports}
            renderItem={({ item }) => (
              <ReportItem
                report={item}
                onPress={() => navigateToDetails(item.id)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshing={loading}
            onRefresh={fetchReports} // <-- aquí se recarga al deslizar hacia abajo
          />

          {/* BOTÓN FLOTANTE */}
          <View className="absolute bottom-8 left-4 right-4 mb-5">
            <Button
              title="Agregar Reporte"
              icon="add-circle-outline"
              onPress={() => router.push("/new")}
            />
          </View>
        </>
      )}
    </View>
  );
}
