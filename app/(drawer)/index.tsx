import { ApiService } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import "../../global.css";
import { recordDiagnostic } from "../../utils/diagnostics";
import AppVersionFooter from "../_components/AppVersionFooter";
import ReportItem from "../components/common/ReportItem";
import Button from "../components/ui/Button";

export default function HomeScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const router = useRouter();

  // 🔹 Cargar reportes
  const fetchReports = async () => {
    setDateFilter(null);
    try {
      setLoading(true);

      // 🔥 SOLO reportes recientes (1 día)
      const data = await ApiService.getRecentPendingReports(2);
      setReports(data);
    } catch (error) {
      recordDiagnostic({
        source: "home.fetchRecentReports",
        message: "No se pudieron cargar los reportes recientes.",
        error,
      });
      console.error("Error fetching recent reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, []),
  );

  // 🔹 Filtrado de reportes
  const filteredReports = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return reports.filter((r) => {
      const caseTypeEn = (r.caseType?.incident || "").toLowerCase();
      const caseTypeEs = (r.caseType?.translate || "").toLowerCase();
      const propertyName = (r.property?.name || "").toLowerCase();
      const monitorName = (
        r.madeBy?.name ||
        r.contributedBy?.name ||
        ""
      ).toLowerCase();

      const matchesSearch =
        caseTypeEn.includes(searchLower) ||
        caseTypeEs.includes(searchLower) ||
        propertyName.includes(searchLower) ||
        monitorName.includes(searchLower);

      const matchesDate = dateFilter ? r.incidentDate === dateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [reports, search, dateFilter]);

  const navigateToDetails = (id: string | number) =>
    router.replace(`/report/${id}`);

  // 🔹 Cambio de fecha
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      const formatted = `${day}/${month}/${year}`;
      setDateFilter(formatted);
    }
  };

  return (
    <View className="flex-1 bg-[#F9F7F1] p-4">
      {/* 🔍 Buscador */}
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
          {/* 🔹 Header con filtros */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1C1C1C] font-semibold text-lg">
              Reportes Pendientes ({filteredReports.length})
            </Text>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center px-3 py-2 rounded-xl border border-[#C9A13B] bg-white"
              >
                <Ionicons name="calendar-outline" size={18} color="#C9A13B" />
                <Text className="text-[#A67C00] ml-2 font-medium">
                  {dateFilter ? dateFilter : "Filtrar Fecha"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}

          {/* 🔹 Lista de reportes */}
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
            contentContainerStyle={{ paddingBottom: 100 }}
            ListFooterComponent={<AppVersionFooter />}
            refreshing={loading}
            onRefresh={fetchReports}
          />

          {/* 🟡 Botón flotante */}
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
