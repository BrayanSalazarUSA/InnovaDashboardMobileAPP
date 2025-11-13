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
import ReportItem from "../components/common/ReportItem";
import Button from "../components/ui/Button";

const apiUrl = process.env.EXPO_PUBLIC_SERVER_IP;

export default function HomeScreen() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const router = useRouter();

  // 🔹 Cargar reportes
  const fetchReports = async () => {
    setDateFilter(null);
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

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [])
  );

  // 🔹 Filtrado de reportes
  const filteredReports = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return reports.filter((r) => {
      const caseTypeEn = (r.caseType?.incident || "").toLowerCase();
      const caseTypeEs = (r.caseType?.translate || "").toLowerCase();
      const propertyName = (r.property?.name || "").toLowerCase();
      const monitorName =
        (r.madeBy?.name || r.contributedBy?.name || "").toLowerCase();

      const matchesSearch =
        caseTypeEn.includes(searchLower) ||
        caseTypeEs.includes(searchLower) ||
        propertyName.includes(searchLower) ||
        monitorName.includes(searchLower);

      const matchesDate = dateFilter ? r.incidentDate === dateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [reports, search, dateFilter]);

  // 🔹 Paginación en memoria
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const navigateToDetails = (id) => router.replace(`/report/${id}`);


  // 🔹 Cambio de fecha
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      const formatted = `${day}/${month}/${year}`;
      setDateFilter(formatted);
      setCurrentPage(1);
    }
  };


  return (
    <View className="flex-1 bg-[#F9F7F1] p-4">
      {/* 🔍 Buscador */}
      <View className="flex-row items-center bg-white rounded-xl px-4 py-1 shadow mb-4">
        <Ionicons name="search" size={20} color="#8A6E28" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar reportes..."
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setCurrentPage(1);
          }}
          className="flex-1 text-gray-800"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C9A13B" style={{ marginTop: 40 }} />
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
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#C9A13B" />
                <Text className="text-[#A67C00] ml-2 font-medium">
                  {dateFilter ? dateFilter : "Filtrar Fecha"}
                </Text>
              </TouchableOpacity>

              {dateFilter && (
                <TouchableOpacity
                  onPress={() => setDateFilter(null)}
                  className="flex-row items-center py- rounded-xl bg-[#FFF5E1]"
                >
                  <Ionicons name="close-circle-outline" size={18} color="red" />
                </TouchableOpacity>
              )}
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
            data={paginatedReports}
            renderItem={({ item }) => (
              <ReportItem report={item} onPress={() => navigateToDetails(item.id)} />
            )}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshing={loading}
            onRefresh={fetchReports}
          />

          {/* 🔹 Controles de paginación */}
          {filteredReports.length > itemsPerPage && (
            <View className="flex-row justify-center items-center mt-2 mb-4">
              <TouchableOpacity
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 mx-1 rounded-full ${
                  currentPage === 1 ? "bg-gray-200" : "bg-[#C9A13B]"
                }`}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={currentPage === 1 ? "#888" : "#fff"}
                />
              </TouchableOpacity>

              <Text className="mx-2 text-[#1C1C1C] font-medium">
                Página {currentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 mx-1 rounded-full ${
                  currentPage === totalPages ? "bg-gray-200" : "bg-[#C9A13B]"
                }`}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={currentPage === totalPages ? "#888" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          )}

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