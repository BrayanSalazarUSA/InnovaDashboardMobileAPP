import { LocalDraftReport } from "@/types/LocalDraftReport";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DraftService } from "../../services/DraftService";
import DraftReportItem from "../components/common/DraftReportItem";
import Header from "../components/common/Header";
/* =========================
   TIPOS INTERNOS
========================= */
type ListItem =
  | { type: "separator"; label: string }
  | { type: "draft"; data: LocalDraftReport };

export default function MyReportsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<LocalDraftReport[]>([]);

  /* =========================
     LOAD DRAFTS
  ========================== */
  const loadDrafts = async () => {
    const data = await DraftService.getAll();
    setDrafts(data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  };

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, []),
  );

  /* =========================
     HELPERS
  ========================== */
  const hoursDiff = (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const insets = useSafeAreaInsets();

  /* =========================
     AGRUPAR POR ANTIGÜEDAD
  ========================== */
  const groupedList: ListItem[] = useMemo(() => {
    const recent: LocalDraftReport[] = [];
    const previous: LocalDraftReport[] = [];
    const old: LocalDraftReport[] = [];

    drafts.forEach((draft) => {
      const diffHours = hoursDiff(draft.updatedAt);

      if (diffHours <= 12) {
        recent.push(draft);
      } else if (diffHours <= 72) {
        previous.push(draft);
      } else {
        old.push(draft);
      }
    });

    const result: ListItem[] = [];

    if (recent.length > 0) {
      result.push({ type: "separator", label: "🟢 Recientes" });
      recent.forEach((d) => result.push({ type: "draft", data: d }));
    }

    if (previous.length > 0) {
      result.push({ type: "separator", label: "🟡 Anteriores" });
      previous.forEach((d) => result.push({ type: "draft", data: d }));
    }

    if (old.length > 0) {
      result.push({ type: "separator", label: "🔴 Antiguos" });
      old.forEach((d) => result.push({ type: "draft", data: d }));
    }

    return result;
  }, [drafts]);

  /* =========================
     ACTIONS
  ========================== */
  const openDraft = (draftId: string) => {
    router.push(`/new?draftId=${draftId}`);
  };

  const deleteDraft = async (draftId: string) => {
    await DraftService.delete(draftId);
    loadDrafts();
  };

  const createNewReport = () => {
    router.push("/new");
  };

  /* =========================
     RENDER ITEM
  ========================== */
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "separator") {
      return (
        <Text className="text-xs uppercase tracking-wide text-[#6A5F3B] font-semibold mt-6 mb-2 px-2">
          {item.label}
        </Text>
      );
    }

    return (
      <DraftReportItem
        draft={item.data}
        onOpen={() => openDraft(item.data.localId)}
        onDelete={() => deleteDraft(item.data.localId)}
      />
    );
  };

  /* =========================
     UI
  ========================== */
  return (
    <View className="flex-1 bg-[#F9F7F1]">
      <Header title="Mis Reportes" />

      {drafts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="document-text-outline" size={48} color="#C9A13B" />
          <Text className="mt-3 text-gray-600 text-center">
            No tienes reportes guardados aún.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedList}
          keyExtractor={(item, index) =>
            item.type === "separator"
              ? `sep-${item.label}-${index}`
              : item.data.localId
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* BOTÓN NUEVO */}
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 16, // 👈 evita barra del sistema
        }}
      >
        <TouchableOpacity
          onPress={createNewReport}
          activeOpacity={0.9}
          className="flex-row items-center justify-center bg-[#006bb3] py-4 rounded-2xl shadow-lg"
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-semibold text-base">
            Nuevo Reporte
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
