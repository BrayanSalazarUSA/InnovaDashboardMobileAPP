import { ApiService } from "@/services/api";
import {
  SupportTicketCategory,
  SupportTicketsApi,
} from "@/services/supportTickets";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import AdaptiveMotionView from "@/components/ui/AdaptiveMotionView";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppVersionFooter from "../_components/AppVersionFooter";
import { recordDiagnostic } from "../../utils/diagnostics";
import type { ReportImage } from "./new";
import ImageUploader from "../components/ui/ImageUploader";
import MonitorPicker from "../components/ui/MonitorPicker";
import PropertyPicker from "../components/ui/PropertyPicker";
import TextAreaInput from "../components/ui/TextAreaInput";

const BUCKET_URL = process.env.EXPO_PUBLIC_BUCKET || "";

type SupportTicket = {
  id: number;
  ticketNumber?: string;
  title: string;
  description?: string;
  category: SupportTicketCategory;
  status: string;
  property?: { id: number; name: string };
  reportedBy?: { id: number; name: string };
  assignedTo?: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  closed?: boolean;
  needsItResponse?: boolean;
  emailNotificationSent?: boolean;
  itResponseReminderCount?: number;
  lastItResponseReminderAt?: string;
  nextItResponseReminderAt?: string;
  lastActivitySummary?: string;
  activityCount?: number;
  attachments?: any[];
  activities?: any[];
  relatedTickets?: any[];
};

type FeedbackState = {
  title: string;
  message: string;
  badge?: string;
};

const CATEGORIES: { value: SupportTicketCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "CAMERA_OFFLINE", label: "Camaras offline" },
  { value: "INTERMITTENCY", label: "Intermitencia" },
  { value: "CAMERA", label: "Camara" },
  { value: "NVR", label: "NVR" },
  { value: "NETWORK", label: "Red" },
  { value: "INTERNET", label: "Internet" },
  { value: "SOFTWARE", label: "Software" },
  { value: "OTHER", label: "Otro" },
];

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En proceso",
  WAITING_FOR_INFORMATION: "Esperando info",
  ON_HOLD: "En pausa",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
};

const STATUS_FILTERS = [
  { value: "OPEN", label: "Abiertos", icon: "radio-button-on-outline" },
  { value: "CLOSED", label: "Cerrados", icon: "checkmark-circle-outline" },
  { value: "ALL", label: "Todos", icon: "albums-outline" },
] as const;

function openDuration(createdAt?: string, closedAt?: string, closed?: boolean) {
  if (!createdAt) return "--";
  const start = new Date(createdAt).getTime();
  const end = closed && closedAt ? new Date(closedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "--";
  const minutes = Math.max(Math.floor((end - start) / 60000), 0);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function categoryLabel(value?: string) {
  return CATEGORIES.find((item) => item.value === value)?.label || value || "Otro";
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name?: string) {
  const value = name?.trim();
  if (!value) return "S";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AvatarBadge({ name }: { name?: string }) {
  return (
    <View className="w-7 h-7 rounded-full bg-[#FFF4CC] border border-[#E8D89B] items-center justify-center">
      <Text className="text-[#8A6E28] text-xs font-bold">{initials(name)}</Text>
    </View>
  );
}

function canEditTicket(ticket?: SupportTicket | null) {
  if (!ticket || ticket.closed || !ticket.createdAt) return false;
  const createdAt = new Date(ticket.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt <= 8 * 60 * 60 * 1000;
}

function activityIcon(type?: string) {
  if (type === "CREATED") return "add-circle-outline";
  if (type === "UPDATED") return "create-outline";
  if (type === "CLOSED") return "checkmark-circle-outline";
  if (type === "LINKED") return "link-outline";
  if (type === "ASSIGNED") return "person-add-outline";
  if (type === "ATTACHMENT_ADDED") return "image-outline";
  return "chatbubble-ellipses-outline";
}

function isReminderActivity(activity: any) {
  const text = `${activity?.title || ""} ${activity?.description || ""}`.toLowerCase();
  return text.includes("reminder") || text.includes("recordatorio");
}

function isLinkActivity(activity: any) {
  const text = `${activity?.activityType || ""} ${activity?.title || ""} ${activity?.description || ""}`.toLowerCase();
  return text.includes("linked") || text.includes("vinculado");
}

function translatedActivityTitle(activity: any) {
  const title = activity?.title || "";
  const type = activity?.activityType;

  if (type === "CREATED" || title.toLowerCase().includes("ticket created")) {
    return "Caso abierto";
  }
  if (type === "UPDATED" || title.toLowerCase().includes("ticket updated")) {
    return "Caso actualizado";
  }
  if (type === "CLOSED" || title.toLowerCase().includes("ticket closed")) {
    return "Caso cerrado";
  }
  if (type === "LINKED" || title.toLowerCase().includes("linked")) {
    return "Caso vinculado";
  }
  if (type === "ASSIGNED" || title.toLowerCase().includes("assigned")) {
    return "Caso asignado";
  }
  if (type === "ATTACHMENT_ADDED") {
    return "Evidencia agregada";
  }

  return title || "Actualizacion";
}

function translatedActivityDescription(activity: any) {
  const description = activity?.description || "";
  const lower = description.toLowerCase();

  if (lower.includes("ticket details were updated")) {
    return "Se actualizaron los detalles del caso.";
  }
  if (lower.includes("ticket created by")) {
    return description.replace("Ticket created by", "Caso abierto por");
  }
  if (lower.includes("ticket assigned to")) {
    return description.replace("Ticket assigned to", "Caso asignado a");
  }
  if (lower.includes("ticket linked to")) {
    return description
      .replace("Ticket linked to", "Caso vinculado con")
      .replace(" as related", " como relacionado")
      .replace(" as duplicate", " como duplicado")
      .replace(" as follow_up", " como seguimiento")
      .replace(" Reason:", " Motivo:")
      .replace(" AI note:", " Nota:");
  }

  return description;
}

function looksResolved(text?: string) {
  const value = (text || "").toLowerCase();
  return [
    "volvio",
    "volvieron",
    "regreso",
    "regresaron",
    "online",
    "en linea",
    "restablecido",
    "resuelto",
    "solucionado",
  ].some((word) => value.includes(word));
}

function attachmentToImage(attachment: any): ReportImage | null {
  const path = attachment?.path || attachment?.url;
  if (!path) return null;

  return {
    id: attachment.id,
    path,
    uri: path.startsWith("http") ? path : `${BUCKET_URL}${path}`,
    isRemote: true,
  };
}

function attachmentToPreview(attachment: any) {
  const path = attachment?.path || attachment?.url;
  if (!path) return null;
  const uri = path.startsWith("http") ? path : `${BUCKET_URL}${path}`;
  const name = attachment?.name || attachment?.fileName || String(path).split("/").pop() || "Evidencia";
  const isImage =
    attachment?.contentType?.startsWith?.("image/") ||
    /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(String(path));

  return isImage ? { id: attachment?.id || path, uri, name } : null;
}

async function copyText(value?: string) {
  const text = value?.trim();
  if (!text) return;
  await Clipboard.setStringAsync(text);
}

function CopyButton({
  text,
  onCopied,
}: {
  text?: string;
  onCopied?: () => void;
}) {
  if (!text?.trim()) return null;

  return (
    <TouchableOpacity
      onPress={async () => {
        await copyText(text);
        onCopied?.();
      }}
      className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 items-center justify-center"
    >
      <Ionicons name="copy-outline" size={15} color="#6B7280" />
    </TouchableOpacity>
  );
}

function FeedbackModal({
  feedback,
  onClose,
}: {
  feedback: FeedbackState | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={Boolean(feedback)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center px-6"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.35)" }}
      >
        <AdaptiveMotionView
          from={{ opacity: 0, scale: 0.94, translateY: 14 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 240 }}
        >
          <View className="overflow-hidden rounded-[30px] border border-[#E8D39B] bg-white">
            <LinearGradient
              colors={["#FFF9E8", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              <View className="items-center">
                <View className="w-20 h-20 rounded-[26px] bg-[#ECFDF5] items-center justify-center border border-[#BBF7D0]">
                  <Ionicons name="checkmark" size={42} color="#16A34A" />
                </View>
                <Text className="text-[26px] leading-[30px] font-semibold text-[#111827] text-center mt-5">
                  {feedback?.title}
                </Text>
                <Text className="text-[#5B6472] text-base text-center mt-3 leading-6">
                  {feedback?.message}
                </Text>
                <View className="mt-4 rounded-full bg-[#ECFDF5] px-4 py-2 flex-row items-center">
                  <Ionicons name="sparkles-outline" size={16} color="#166534" />
                  <Text className="text-[#166534] font-medium ml-2">
                    {feedback?.badge || "Accion confirmada"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.9}
                className="mt-6"
              >
                <LinearGradient
                  colors={["#22C55E", "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 22,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    Perfecto
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </AdaptiveMotionView>
      </View>
    </Modal>
  );
}

export default function SupportTicketsScreen() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ open: 0, closed: 0, all: 0 });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [search, setSearch] = useState("");
  const categoryFilter: SupportTicketCategory | "ALL" = "ALL";
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "ALL" | "CLOSED">(
    "OPEN",
  );

  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideSection, setGuideSection] = useState<"use" | "updates" | "states">("use");
  const [remindersVisible, setRemindersVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [similarVisible, setSimilarVisible] = useState(false);
  const [similarSuggestions, setSimilarSuggestions] = useState<any[]>([]);
  const [similarPreview, setSimilarPreview] = useState<any | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<{ uri: string; name: string } | null>(null);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [reportedById, setReportedById] = useState<number | null>(null);
  const [category, setCategory] =
    useState<SupportTicketCategory>("CAMERA_OFFLINE");
  const [images, setImages] = useState<ReportImage[]>([]);
  const [activityMessage, setActivityMessage] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [actorAction, setActorAction] = useState<"update" | "close" | null>(null);

  const selectedUserId = reportedById || selectedTicket?.reportedBy?.id || 1;

  const loadCatalogs = useCallback(async () => {
    const [propertiesResult, monitorsResult] = await Promise.allSettled([
      ApiService.getProperties(),
      ApiService.getMonitors(),
    ]);

    if (propertiesResult.status === "fulfilled") {
      setProperties(propertiesResult.value || []);
    }
    if (monitorsResult.status === "fulfilled") {
      setMonitors(monitorsResult.value || []);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const [openResult, closedResult, allResult] = await Promise.allSettled([
        SupportTicketsApi.list({
          category: categoryFilter,
          onlyOpen: true,
          page: 0,
          size: 1,
          userId: selectedUserId,
        }),
        SupportTicketsApi.list({
          category: categoryFilter,
          onlyClosed: true,
          page: 0,
          size: 1,
          userId: selectedUserId,
        }),
        SupportTicketsApi.list({
          category: categoryFilter,
          page: 0,
          size: 1,
          userId: selectedUserId,
        }),
      ]);

      setCounts({
        open:
          openResult.status === "fulfilled"
            ? Number(openResult.value?.totalElements || 0)
            : 0,
        closed:
          closedResult.status === "fulfilled"
            ? Number(closedResult.value?.totalElements || 0)
            : 0,
        all:
          allResult.status === "fulfilled"
            ? Number(allResult.value?.totalElements || 0)
            : 0,
      });
    } catch {
      setCounts({ open: 0, closed: 0, all: 0 });
    }
  }, [categoryFilter, selectedUserId]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await SupportTicketsApi.list({
        query: "",
        category: categoryFilter,
        onlyOpen: statusFilter === "OPEN",
        onlyClosed: statusFilter === "CLOSED",
        status: "ALL",
        size: 40,
        userId: selectedUserId,
      });
      setTickets(response?.items || []);
      void loadCounts();
    } catch {
      recordDiagnostic({
        source: "supportTickets.loadTickets",
        message: "No se pudieron cargar los casos de soporte.",
        error,
      });
      Alert.alert("Conexion inestable", "No se pudieron cargar los casos.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, loadCounts, selectedUserId, statusFilter]);

  const refreshSelectedTicket = useCallback(async () => {
    if (!selectedTicket?.id) return;
    try {
      const detail = await SupportTicketsApi.detail(selectedTicket.id, {
        userId: selectedTicket.reportedBy?.id || selectedUserId,
      });
      setSelectedTicket(detail);
    } catch (error) {
      recordDiagnostic({
        source: "supportTickets.refreshSelectedTicket",
        message: "No se pudo refrescar el detalle del caso.",
        error,
      });
    }
  }, [selectedTicket?.id, selectedTicket?.reportedBy?.id, selectedUserId]);

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setCloseDialogVisible(false);
    setActorAction(null);
    void loadTickets();
  }, [loadTickets]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalogs();
      void loadTickets();
      if (detailVisible && selectedTicket?.id) {
        void refreshSelectedTicket();
      }
    }, [detailVisible, loadCatalogs, loadTickets, refreshSelectedTicket, selectedTicket?.id]),
  );

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;

    return tickets.filter((ticket) => {
      return [
        ticket.ticketNumber,
        ticket.title,
        ticket.property?.name,
        ticket.reportedBy?.name,
        categoryLabel(ticket.category),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [search, tickets]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPropertyId("");
    setReportedById(null);
    setCategory("CAMERA_OFFLINE");
    setImages([]);
    setEditingTicket(null);
  };

  const openCreate = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEdit = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setTitle(ticket.title || "");
    setDescription(ticket.description || "");
    setPropertyId(ticket.property?.id ? String(ticket.property.id) : "");
    setReportedById(ticket.reportedBy?.id || null);
    setCategory(ticket.category || "OTHER");
    setImages((ticket.attachments || []).map(attachmentToImage).filter(Boolean) as ReportImage[]);
    setDetailVisible(false);
    setFormVisible(true);
  };

  const openDetail = async (ticket: SupportTicket) => {
    try {
      setSelectedTicket(ticket);
      setActorAction(null);
      setCloseDialogVisible(false);
      setDetailVisible(true);
      const detail = await SupportTicketsApi.detail(ticket.id, {
        userId: ticket.reportedBy?.id || selectedUserId,
      });
      setSelectedTicket(detail);
    } catch (error) {
      recordDiagnostic({
        source: "supportTickets.openDetail",
        message: "No se pudo cargar el detalle del caso de soporte.",
        error,
      });
    }
  };

  const openLinkedTicket = async (linkedTicket: SupportTicket) => {
    if (!linkedTicket?.id) return;
    await openDetail(linkedTicket);
  };

  const uploadImages = async (ticketId: number, userId: number | string | null) => {
    let failed = 0;
    const localImages = images.filter((image) => !image.isRemote);

    for (const [index, image] of localImages.entries()) {
      try {
        await SupportTicketsApi.uploadAttachment(
          ticketId,
          {
            uri: image.uri,
            type: "image/jpeg",
            name: `support_evidence_${index + 1}.jpg`,
          },
          { userId },
        );
      } catch (error) {
        failed += 1;
        recordDiagnostic({
          source: "supportTickets.uploadImage",
          message: "No se pudo subir una evidencia del caso de soporte.",
          error,
        });
      }
    }

    return failed;
  };

  const finishSubmit = async (payload: any, selectedRelationship?: any | null) => {
    const numericReporterId = Number(payload.reportedById);
    let saved: SupportTicket;

    if (editingTicket) {
      saved = await SupportTicketsApi.update(
        editingTicket.id,
        { ...payload, priority: "MEDIUM" },
        { userId: numericReporterId },
      );
    } else {
      saved = await SupportTicketsApi.create(
        selectedRelationship
          ? {
              ...payload,
              relatedTicketId: selectedRelationship.ticketId,
              relationType: selectedRelationship.relationType || "RELATED",
              relationReason: "Vinculado desde mobile al crear el caso.",
              aiRelationReason: selectedRelationship.reason,
              aiRelationConfidence: selectedRelationship.confidence,
            }
          : payload,
        { userId: numericReporterId },
      );
    }

    const failed = await uploadImages(saved.id, numericReporterId);
    setFormVisible(false);
    setSimilarVisible(false);
    setSimilarSuggestions([]);
    setSimilarPreview(null);
    setPendingPayload(null);
    resetForm();
    await loadTickets();

    setFeedback({
      title: editingTicket ? "Caso actualizado" : "Caso creado",
      message:
        failed > 0
          ? `El caso quedo guardado, pero ${failed} foto(s) no se pudieron subir. Puedes agregar una actualizacion despues.`
          : "La informacion quedo guardada correctamente.",
      badge: failed > 0 ? "Guardado con aviso" : "Soporte informado",
    });
  };

  const handleSubmit = async () => {
    const numericPropertyId = Number(propertyId);
    const numericReporterId = Number(reportedById);

    if (!title.trim() || !description.trim() || !numericPropertyId || !numericReporterId) {
      Alert.alert("Faltan datos", "Completa titulo, descripcion, propiedad y agente.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        propertyId: numericPropertyId,
        reportedById: numericReporterId,
      };

      if (editingTicket) {
        await finishSubmit(payload, null);
        return;
      }

      const suggestionsResponse = await SupportTicketsApi.suggestRelationships(
        payload,
        { userId: numericReporterId },
      );
      const suggestions = suggestionsResponse?.suggestions || [];

      if (suggestions.length > 0) {
        setPendingPayload(payload);
        setSimilarSuggestions(suggestions);
        setSimilarPreview(null);
        setSimilarVisible(true);
        return;
      }

      await finishSubmit(payload, null);
    } catch (error: any) {
      recordDiagnostic({
        source: "supportTickets.submit",
        message: "No se pudo guardar el caso de soporte.",
        error,
      });
      Alert.alert("Error", error?.message || "No se pudo guardar el caso.");
    } finally {
      setSaving(false);
    }
  };

  const previewSimilarTicket = async (suggestion: any) => {
    try {
      setSimilarPreview({ loading: true, ticketNumber: suggestion.ticketNumber });
      const detail = await SupportTicketsApi.detail(suggestion.ticketId, {
        userId: pendingPayload?.reportedById || selectedUserId,
      });
      setSimilarPreview(detail);
    } catch {
      setSimilarPreview({
        error: true,
        title: suggestion.title,
        ticketNumber: suggestion.ticketNumber,
      });
    }
  };

  const requestActorForAction = (action: "update" | "close") => {
    if (action === "update" && !activityMessage.trim()) return;
    if (action === "close" && !closeNote.trim()) return;
    setActorAction(action);
  };

  const handleAddActivity = async (actorId: number) => {
    if (!selectedTicket || !activityMessage.trim()) return;

    try {
      setSaving(true);
      await SupportTicketsApi.addActivity(selectedTicket.id, activityMessage.trim(), {
        userId: actorId,
      });
      setActivityMessage("");
      setActorAction(null);
      await refreshSelectedTicket();
      await loadTickets();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo agregar la actualizacion.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (actorId: number) => {
    if (!selectedTicket || !closeNote.trim()) return;

    try {
      setSaving(true);
      await SupportTicketsApi.close(selectedTicket.id, closeNote.trim(), {
        userId: actorId,
      });
      setCloseNote("");
      setActorAction(null);
      setCloseDialogVisible(false);
      setDetailVisible(false);
      await loadTickets();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo cerrar el caso.");
    } finally {
      setSaving(false);
    }
  };

  const updateExistingTicketFromSuggestion = async (
    suggestion: any,
    closeAfterUpdate = false,
  ) => {
    if (!pendingPayload) return;

    try {
      setSaving(true);
      const message = `${pendingPayload.title}\n\n${pendingPayload.description}`;
      await SupportTicketsApi.addActivity(suggestion.ticketId, message, {
        userId: pendingPayload.reportedById,
      });

      const failed = await uploadImages(suggestion.ticketId, pendingPayload.reportedById);

      if (closeAfterUpdate) {
        await SupportTicketsApi.close(
          suggestion.ticketId,
          pendingPayload.description,
          { userId: pendingPayload.reportedById },
        );
      }

      setFormVisible(false);
      setSimilarVisible(false);
      setSimilarSuggestions([]);
      setSimilarPreview(null);
      setPendingPayload(null);
      resetForm();
      await loadTickets();

      setFeedback({
        title: closeAfterUpdate ? "Caso cerrado" : "Caso actualizado",
        message:
          failed > 0
            ? `Se guardo la actualizacion, pero ${failed} foto(s) no se pudieron subir.`
            : closeAfterUpdate
              ? "El caso existente quedo cerrado con el resumen indicado."
              : "La informacion se agrego al caso existente.",
        badge: closeAfterUpdate ? "Resuelto" : "Sin duplicar caso",
      });
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo actualizar el caso existente.");
    } finally {
      setSaving(false);
    }
  };

  const renderTicket = ({ item }: { item: SupportTicket }) => (
    <TouchableOpacity
      onPress={() => openDetail(item)}
      activeOpacity={0.85}
      className="bg-white rounded-xl border border-[#EFE2B7] p-4 mb-3"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[#A67C00] font-semibold">
            {item.ticketNumber || `Caso #${item.id}`}
          </Text>
          <Text className="text-gray-900 text-base font-semibold mt-1">
            {item.title}
          </Text>
          <Text className="text-gray-600 mt-1" numberOfLines={2}>
            {item.property?.name || "Sin propiedad"} - {categoryLabel(item.category)}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full ${
            item.closed ? "bg-gray-100" : "bg-[#EAF7EE]"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.closed ? "text-gray-600" : "text-[#1D7A3A]"
            }`}
          >
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center mt-3">
        <Ionicons name="person-outline" size={14} color="#8A6E28" />
        <Text className="text-xs text-gray-500 ml-1 flex-1">
          {item.reportedBy?.name || "Agente no asignado"}
        </Text>
        <Text className="text-xs text-gray-400">{formatDate(item.updatedAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const statusCount = (value: (typeof STATUS_FILTERS)[number]["value"]) => {
    if (value === "OPEN") return counts.open;
    if (value === "CLOSED") return counts.closed;
    return counts.all;
  };

  const renderTimeline = () => {
    const activities = (selectedTicket?.activities || [])
      .filter((activity) => !isReminderActivity(activity))
      .filter((activity) => {
        const hasVisibleLinkSection = (selectedTicket?.relatedTickets || []).length > 0;
        return !(hasVisibleLinkSection && isLinkActivity(activity));
      })
      .slice()
      .reverse();
    const links = selectedTicket?.relatedTickets || [];

    if (activities.length === 0 && links.length === 0) {
      return (
        <View className="bg-white border border-[#EFE2B7] rounded-xl p-4">
          <Text className="text-gray-500">
            Aun no hay actualizaciones visibles para este caso.
          </Text>
        </View>
      );
    }

    return (
      <View className="mb-4">
        {activities.map((activity, index) => (
          <View key={activity.id || `${activity.activityType}-${index}`} className="flex-row mb-3">
            <View className="items-center mr-3">
              <View className="w-8 h-8 rounded-full bg-[#FFF4CC] items-center justify-center border border-[#E8D89B]">
                <Ionicons
                  name={activityIcon(activity.activityType) as any}
                  size={17}
                  color="#A67C00"
                />
              </View>
              {index < activities.length - 1 && (
                <View className="w-[1px] flex-1 bg-[#E8D89B] mt-1" />
              )}
            </View>
            <View className="flex-1 bg-white border border-[#EFE2B7] rounded-xl p-3">
              <View className="flex-row items-center mb-2">
                <AvatarBadge name={activity.author?.name || "Sistema"} />
                <View className="ml-2 flex-1">
                  <Text className="text-gray-800 font-semibold">
                    {activity.author?.name || "Sistema"}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {formatDate(activity.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <Text selectable className="text-gray-900 font-semibold flex-1 pr-2">
                  {translatedActivityTitle(activity)}
                </Text>
                <CopyButton
                  text={`${translatedActivityTitle(activity)}\n${translatedActivityDescription(activity)}`}
                  onCopied={() =>
                    setFeedback({
                      title: "Texto copiado",
                      message: "Ya puedes pegarlo en un traductor, chat o nota.",
                      badge: "Listo para pegar",
                    })
                  }
                />
              </View>
              {!!translatedActivityDescription(activity) && (
                <Text selectable className="text-gray-600 mt-1">
                  {translatedActivityDescription(activity)}
                </Text>
              )}
              {activity.activityType === "LINKED" && links.length > 0 && (
                <View className="mt-2">
                  {links.map((link) => (
                    <TouchableOpacity
                      key={link.id}
                      onPress={() => openLinkedTicket(link.linkedTicket)}
                      className="flex-row items-center py-1"
                    >
                      <Ionicons name="link-outline" size={14} color="#006bb3" />
                      <Text className="text-[#006bb3] ml-1 font-semibold">
                        {link.linkedTicket?.ticketNumber || `Caso #${link.linkedTicket?.id}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRelatedTickets = () => {
    const links = selectedTicket?.relatedTickets || [];
    if (!links.length) return null;

    return (
      <View className="mb-5">
        <View className="flex-row items-center mb-2">
          <Ionicons name="link-outline" size={18} color="#A67C00" />
          <Text className="font-semibold text-gray-900 ml-2">
            Casos vinculados
          </Text>
        </View>
        <View className="bg-white border border-[#EFE2B7] rounded-xl overflow-hidden">
          {links.map((link, index) => {
            const ticket = link.linkedTicket;
            return (
              <TouchableOpacity
                key={link.id || ticket?.id || index}
                onPress={() => openLinkedTicket(ticket)}
                className={`p-4 ${index < links.length - 1 ? "border-b border-[#F0E7CE]" : ""}`}
              >
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-full bg-[#FFF4CC] items-center justify-center border border-[#E8D89B] mr-3">
                    <Ionicons name="git-branch-outline" size={18} color="#A67C00" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#006bb3] font-bold">
                      {ticket?.ticketNumber || `Caso #${ticket?.id || ""}`}
                    </Text>
                    <Text className="text-gray-900 font-semibold mt-1">
                      {ticket?.title || "Caso relacionado"}
                    </Text>
                    <Text className="text-gray-500 mt-1">
                      {link.relationType === "DUPLICATE"
                        ? "Marcado como duplicado"
                        : link.relationType === "FOLLOW_UP"
                          ? "Seguimiento del mismo tema"
                          : "Relacionado con este caso"}
                    </Text>
                    <View className="flex-row items-center mt-3">
                      <AvatarBadge name={link.createdBy?.name || "Sistema"} />
                      <Text className="text-gray-500 text-xs ml-2 flex-1">
                        Vinculado por {link.createdBy?.name || "Sistema"} - {formatDate(link.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEvidenceStrip = () => {
    const previews = (selectedTicket?.attachments || [])
      .map(attachmentToPreview)
      .filter(Boolean) as { id: string | number; uri: string; name: string }[];

    if (!previews.length) return null;

    return (
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-gray-900 font-semibold">Evidencia visual</Text>
          <Text className="text-gray-500 text-xs">
            {previews.length} foto{previews.length === 1 ? "" : "s"}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {previews.map((preview, index) => (
            <TouchableOpacity
              key={preview.id}
              activeOpacity={0.88}
              className={`${index === 0 ? "" : "ml-3"} rounded-2xl overflow-hidden border border-[#F0E7CE] bg-[#FFFDF6]`}
              onPress={() => setSelectedEvidence({ uri: preview.uri, name: preview.name })}
            >
              <Image
                source={{ uri: preview.uri }}
                className="w-28 h-24"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F9F7F1] p-4">
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />

      <Modal
        visible={Boolean(selectedEvidence)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedEvidence(null)}
      >
        <View className="flex-1 bg-black/90 justify-center">
          <TouchableOpacity
            onPress={() => setSelectedEvidence(null)}
            className="absolute top-12 right-5 z-10 w-11 h-11 rounded-full bg-black/50 items-center justify-center"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedEvidence?.uri ? (
            <Image
              source={{ uri: selectedEvidence.uri }}
              className="w-full h-[78%]"
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={guideVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-2xl p-5 max-h-[82%]">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-gray-900">
                  Guia rapida de soporte
                </Text>
                <Text className="text-gray-600 mt-1">
                  Usa esta guia para decidir que hacer con cada caso.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGuideVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: "use", label: "1. Uso", icon: "list-outline" },
                { key: "updates", label: "2. Seguimiento", icon: "time-outline" },
                { key: "states", label: "3. Estados", icon: "flag-outline" },
              ].map((section) => (
                <TouchableOpacity
                  key={section.key}
                  onPress={() => setGuideSection(section.key as typeof guideSection)}
                  className={`flex-row items-center rounded-xl border px-3 py-3 mb-2 ${
                    guideSection === section.key
                      ? "bg-[#FFF8E1] border-[#E8D89B]"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Ionicons
                    name={section.icon as any}
                    size={18}
                    color={guideSection === section.key ? "#A67C00" : "#6B7280"}
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      guideSection === section.key ? "text-[#8A6E28]" : "text-gray-600"
                    }`}
                  >
                    {section.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {guideSection === "use" && (
                <View className="mt-2">
                  {[
                    {
                      title: "Crear caso nuevo",
                      text: "Ejemplo: Oakgrove tiene playback caido y no hay caso abierto parecido.",
                    },
                    {
                      title: "Actualizar",
                      text: "Ejemplo: ya habia 6 camaras offline y ahora son 12, o agregaste nuevas fotos.",
                    },
                    {
                      title: "Vincular",
                      text: "Ejemplo: otro agente reporto el mismo problema en la misma propiedad.",
                    },
                    {
                      title: "Cerrar",
                      text: "Ejemplo: IT confirma que las camaras volvieron o el cliente confirma solucion.",
                    },
                  ].map((item) => (
                    <View key={item.title} className="bg-[#FFFDF6] border border-[#F0E7CE] rounded-xl p-3 mb-2">
                      <Text className="text-gray-900 font-bold">{item.title}</Text>
                      <Text className="text-gray-600 mt-1 leading-5">{item.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {guideSection === "updates" && (
                <View className="mt-2 bg-[#F7FAFF] border border-[#DCE7F7] rounded-xl p-3">
                  <Text className="text-[#1F5F99] font-bold">Como saber en que va</Text>
                  <Text className="text-gray-600 mt-2 leading-5">
                    Abre el caso y revisa Linea de tiempo. Alli veras si IT agrego una actualizacion, si se envio correo, si cambio el estado, si se asigno a Sunny o si se vinculo con otro caso.
                  </Text>
                  <Text className="text-gray-600 mt-2 leading-5">
                    Si tu equipo tiene informacion nueva, usa Agregar actualizacion. Eso no cierra el caso: solo deja trazabilidad para IT.
                  </Text>
                </View>
              )}

              {guideSection === "states" && (
                <View className="mt-2">
                  {[
                    ["Abierto", "IT aun debe revisar o responder."],
                    ["En proceso", "IT ya tomo accion o empezo revision."],
                    ["Esperando cliente", "IT necesita respuesta, acceso, reinicio o confirmacion del cliente."],
                    ["En pausa", "Se espera visita tecnica, tercero o una condicion externa."],
                    ["Cerrado", "El problema ya fue resuelto o no requiere mas accion."],
                  ].map(([state, meaning]) => (
                    <View key={state} className="flex-row mb-3">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#C9A13B] mt-2 mr-3" />
                      <View className="flex-1">
                        <Text className="text-gray-900 font-bold">{state}</Text>
                        <Text className="text-gray-600 leading-5">{meaning}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View className="bg-[#F7FAFF] border border-[#DCE7F7] rounded-xl p-3 mt-1">
                <Text className="text-[#1F5F99] font-semibold">Regla simple</Text>
                <Text className="text-gray-600 mt-1 leading-5">
                  Si es el mismo problema, actualiza o vincula. Si ya se soluciono, cierra. Si es otro problema distinto, crea un caso aparte.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center bg-white rounded-xl px-4 py-1 shadow mb-3">
        <Ionicons name="search" size={20} color="#8A6E28" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar casos..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadTickets}
          className="flex-1 text-gray-800"
        />
        <TouchableOpacity onPress={loadTickets}>
          <Ionicons name="refresh" size={20} color="#8A6E28" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setGuideVisible(true)}
          className="ml-3 w-8 h-8 rounded-full bg-[#FFF8E1] border border-[#E8D89B] items-center justify-center"
        >
          <Ionicons name="information-circle-outline" size={20} color="#8A6E28" />
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 36 }}
          contentContainerStyle={{ alignItems: "center", paddingRight: 8 }}
        >
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status.value}
            onPress={() => setStatusFilter(status.value)}
            className={`mr-2 px-3 py-1.5 rounded-full border flex-row items-center ${
              statusFilter === status.value ? "bg-[#C9A13B] border-[#C9A13B]" : "bg-white border-[#EFE2B7]"
            }`}
          >
            <Ionicons
              name={status.icon}
              size={15}
              color={statusFilter === status.value ? "#fff" : "#8A6E28"}
              style={{ marginRight: 5 }}
            />
            <Text className={`text-sm ${statusFilter === status.value ? "text-white font-semibold" : "text-[#8A6E28] font-medium"}`}>
              {status.label} ({statusCount(status.value)})
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[#1C1C1C] font-semibold text-lg">
          Casos de Soporte ({filteredTickets.length})
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C9A13B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicket}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshing={loading}
          onRefresh={loadTickets}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              No hay casos con estos filtros.
            </Text>
          }
          ListFooterComponent={<AppVersionFooter />}
        />
      )}

      <View className="absolute bottom-8 left-4 right-4 mb-5">
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.9}
          className="bg-[#006bb3] rounded-2xl py-4 flex-row items-center justify-center shadow-lg"
        >
          <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-semibold text-base">Agregar Caso</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <ScrollView className="flex-1 bg-[#F9F7F1] px-4 pt-5" contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-2xl font-bold text-gray-900">
              {editingTicket ? "Editar caso" : "Agregar caso"}
            </Text>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Ionicons name="close" size={28} color="#1C1C1C" />
            </TouchableOpacity>
          </View>

          <Text className="font-semibold text-[#A67C00] mb-1">Titulo</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Camaras offline en lobby"
            className="border border-[#F2DEA2] rounded-xl bg-white px-4 py-3 mb-4 text-gray-800"
          />

          <PropertyPicker
            label="Propiedad"
            properties={properties.map((property) => ({ ...property, id: String(property.id) }))}
            selectedId={propertyId}
            onSelect={setPropertyId}
          />

          <MonitorPicker
            label="Agente que reporta"
            monitors={monitors}
            selectedId={reportedById}
            onSelect={setReportedById}
          />

          <Text className="font-semibold text-[#A67C00] mb-2">Categoria</Text>
          <View className="flex-row flex-wrap mb-4">
            {CATEGORIES.filter((item) => item.value !== "ALL").map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setCategory(item.value as SupportTicketCategory)}
                className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                  category === item.value ? "bg-[#C9A13B] border-[#C9A13B]" : "bg-white border-[#EFE2B7]"
                }`}
              >
                <Text className={category === item.value ? "text-white font-semibold" : "text-[#8A6E28]"}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextAreaInput
            label="Descripcion"
            value={description}
            onChange={setDescription}
            placeholder="Describe que esta pasando y desde cuando..."
            icon={<MaterialCommunityIcons name="note-text-outline" size={22} color="#A67C00" />}
          />

          <ImageUploader
            label="Fotos"
            images={images}
            setImages={setImages}
            maxImages={6}
            onRemoveRemoteImage={async (image) => {
              if (!editingTicket || !image.id) return;
              await SupportTicketsApi.deleteAttachment(editingTicket.id, image.id, {
                userId: reportedById || editingTicket.reportedBy?.id || selectedUserId,
              });
            }}
          />

          <TouchableOpacity
            disabled={saving}
            onPress={handleSubmit}
            activeOpacity={0.9}
            className={`rounded-2xl py-4 items-center ${saving ? "bg-[#006bb3]/60" : "bg-[#006bb3]"}`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {editingTicket ? "Guardar cambios" : "Crear caso"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal
        visible={similarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSimilarVisible(false);
          setSaving(false);
        }}
      >
        <View className="flex-1 bg-black/45 justify-center px-4">
          <View className="bg-white rounded-2xl p-5 max-h-[86%]">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-gray-900">
                  Casos parecidos encontrados
                </Text>
                <Text className="text-gray-600 mt-1">
                  Elige que hacer para evitar duplicados y mantener a IT con el contexto correcto.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSimilarVisible(false);
                  setSaving(false);
                }}
              >
                <Ionicons name="close" size={26} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 410 }}>
              {similarSuggestions.map((suggestion) => (
                <View
                  key={`${suggestion.ticketId}-${suggestion.ticketNumber}`}
                  className="border border-[#EFE2B7] rounded-xl p-4 mb-3 bg-[#FFFDF6]"
                >
                  <View className="flex-row items-start">
                    <View className="flex-1 pr-3">
                      <Text className="text-[#A67C00] font-bold">
                        {suggestion.ticketNumber || `Caso #${suggestion.ticketId}`}
                      </Text>
                      <Text className="text-gray-900 font-semibold mt-1">
                        {suggestion.title}
                      </Text>
                      <Text className="text-gray-600 mt-2">
                        {suggestion.reason || "Coincide por propiedad, categoria o descripcion."}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => previewSimilarTicket(suggestion)}
                      className="w-10 h-10 rounded-full bg-white border border-[#E8D89B] items-center justify-center"
                    >
                      <Ionicons name="eye-outline" size={20} color="#A67C00" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center mt-3">
                    <View className="px-2 py-1 rounded-full bg-white border border-[#E8D89B]">
                      <Text className="text-xs text-[#8A6E28] font-semibold">
                        {Math.round((suggestion.confidence || 0) * 100)}% parecido
                      </Text>
                    </View>
                    <View className="px-2 py-1 rounded-full bg-white border border-[#E8D89B] ml-2">
                      <Text className="text-xs text-[#8A6E28] font-semibold">
                        {suggestion.status || "Abierto"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    disabled={saving || !pendingPayload}
                    onPress={() => updateExistingTicketFromSuggestion(suggestion, false)}
                    className="mt-4 bg-[#1D7A3A] rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold">
                      Actualizar este caso existente
                    </Text>
                  </TouchableOpacity>

                  {looksResolved(`${pendingPayload?.title || ""} ${pendingPayload?.description || ""}`) && (
                    <TouchableOpacity
                      disabled={saving || !pendingPayload}
                      onPress={() => updateExistingTicketFromSuggestion(suggestion, true)}
                      className="mt-2 bg-[#166534] rounded-xl py-3 items-center"
                    >
                      <Text className="text-white font-semibold">
                        Cerrar este caso como resuelto
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    disabled={saving || !pendingPayload}
                    onPress={async () => {
                      if (!pendingPayload) return;
                      try {
                        await finishSubmit(pendingPayload, suggestion);
                      } catch (error: any) {
                        Alert.alert("Error", error?.message || "No se pudo vincular el caso.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="mt-2 bg-[#006bb3] rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold">
                      Crear nuevo vinculado
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {similarPreview && (
                <View className="border border-[#DCE7F7] bg-[#F7FAFF] rounded-xl p-4 mb-3">
                  <Text className="text-[#006bb3] font-bold mb-1">
                    Vista rapida
                  </Text>
                  {similarPreview.loading ? (
                    <ActivityIndicator color="#006bb3" />
                  ) : similarPreview.error ? (
                    <Text className="text-gray-600">
                      No se pudo cargar el detalle de {similarPreview.ticketNumber}.
                    </Text>
                  ) : (
                    <>
                      <View className="flex-row items-start">
                        <Text selectable className="text-gray-900 font-semibold flex-1 pr-2">
                          {similarPreview.ticketNumber} - {similarPreview.title}
                        </Text>
                        <CopyButton
                          text={`${similarPreview.ticketNumber} - ${similarPreview.title}\n${similarPreview.description || ""}`}
                          onCopied={() =>
                            setFeedback({
                              title: "Texto copiado",
                              message: "La vista rapida quedo copiada.",
                              badge: "Listo para pegar",
                            })
                          }
                        />
                      </View>
                      <Text selectable className="text-gray-600 mt-2">
                        {similarPreview.description}
                      </Text>
                      <Text className="text-[#8A6E28] mt-2">
                        {similarPreview.property?.name} - {categoryLabel(similarPreview.category)}
                      </Text>
                      <Text className="text-gray-500 mt-1">
                        Ultima actualizacion: {formatDate(similarPreview.updatedAt)}
                      </Text>
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            <View className="border-t border-gray-100 pt-3 mt-2">
              <TouchableOpacity
                disabled={saving || !pendingPayload}
                onPress={async () => {
                  if (!pendingPayload) return;
                  try {
                    await finishSubmit(pendingPayload, null);
                  } catch (error: any) {
                    Alert.alert("Error", error?.message || "No se pudo crear el caso.");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="border border-[#C9A13B] rounded-xl py-3 items-center mb-2 bg-white"
              >
                <Text className="text-[#A67C00] font-semibold">
                  No es el mismo problema, crear aparte
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSimilarVisible(false);
                  setSaving(false);
                }}
                className="py-2 items-center"
              >
                <Text className="text-gray-500 font-semibold">Volver al formulario</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailVisible} animationType="slide" onRequestClose={closeDetail}>
        <ScrollView className="flex-1 bg-[#F9F7F1] px-4 pt-5" contentContainerStyle={{ paddingBottom: 60 }}>
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-bold text-gray-900 flex-1">
              {selectedTicket?.ticketNumber || "Caso de soporte"}
            </Text>
            <TouchableOpacity onPress={closeDetail}>
              <Ionicons name="close" size={28} color="#1C1C1C" />
            </TouchableOpacity>
          </View>

          {selectedTicket && (
            <>
              <View className="bg-white rounded-2xl border border-[#EFE2B7] p-4 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-[#A67C00] text-xs font-bold">
                      {selectedTicket.ticketNumber}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Abierto {formatDate(selectedTicket.createdAt)}
                    </Text>
                  </View>
                  <View className="px-3 py-1 rounded-full bg-[#EAF7EE] border border-[#BFE7CC]">
                    <Text className="text-[#1D7A3A] text-xs font-bold">
                      {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start">
                  <Text selectable className="text-gray-900 text-lg font-bold flex-1 pr-3">
                    {selectedTicket.title}
                  </Text>
                  <CopyButton
                    text={`${selectedTicket.title}\n${selectedTicket.description || ""}`}
                    onCopied={() =>
                      setFeedback({
                        title: "Texto copiado",
                        message: "El titulo y la descripcion quedaron copiados.",
                        badge: "Listo para pegar",
                      })
                    }
                  />
                  {canEditTicket(selectedTicket) && (
                    <TouchableOpacity
                      onPress={() => openEdit(selectedTicket)}
                      className="w-9 h-9 rounded-full bg-[#FFF4CC] items-center justify-center border border-[#E8D89B] ml-2"
                    >
                      <Ionicons name="pencil" size={17} color="#A67C00" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text selectable className="text-gray-600 mt-2">{selectedTicket.description}</Text>
                <Text className="text-[#8A6E28] mt-3">
                  {selectedTicket.property?.name} - {categoryLabel(selectedTicket.category)}
                </Text>
                <Text className="text-gray-500 mt-1">
                  Asignado a {selectedTicket.assignedTo?.name || "support@innovatechcorp.net"}
                </Text>
                <View className="flex-row mt-4">
                  <View className="flex-1 rounded-xl bg-[#FFFDF6] border border-[#F0E7CE] p-3 mr-2">
                    <Text className="text-gray-500 text-[11px] font-semibold">Tiempo</Text>
                    <Text className="text-gray-900 font-bold mt-1">
                      {openDuration(selectedTicket.createdAt, selectedTicket.closedAt, selectedTicket.closed)}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-[#FFFDF6] border border-[#F0E7CE] p-3 mr-2">
                    <Text className="text-gray-500 text-[11px] font-semibold">Fotos</Text>
                    <Text className="text-gray-900 font-bold mt-1">
                      {selectedTicket.attachments?.length || 0}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-[#FFFDF6] border border-[#F0E7CE] p-3">
                    <Text className="text-gray-500 text-[11px] font-semibold">Eventos</Text>
                    <Text className="text-gray-900 font-bold mt-1">
                      {selectedTicket.activities?.length || selectedTicket.activityCount || 0}
                    </Text>
                  </View>
                </View>
                {renderEvidenceStrip()}
                <TouchableOpacity
                  onPress={() => setRemindersVisible(true)}
                  className="self-start flex-row items-center mt-3 px-3 py-2 rounded-full bg-gray-50 border border-gray-200"
                >
                  <Ionicons name="notifications-outline" size={15} color="#6B7280" />
                  <Text className="text-gray-600 text-xs font-semibold ml-1">
                    Recordatorios y avisos
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="font-semibold text-[#A67C00] mb-1">Actualizacion</Text>
              <TextInput
                value={activityMessage}
                onChangeText={setActivityMessage}
                multiline
                placeholder="Agregar una nota o avance..."
                className="bg-white border border-[#F2DEA2] rounded-xl px-4 py-3 min-h-[90px] text-gray-800 mb-3"
              />
              <TouchableOpacity
                disabled={saving || !activityMessage.trim()}
                onPress={() => requestActorForAction("update")}
                className="bg-[#006bb3] rounded-xl py-3 items-center mb-5"
              >
                <Text className="text-white font-semibold">Agregar actualizacion</Text>
              </TouchableOpacity>

              {!selectedTicket.closed && (
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => {
                    setCloseNote("");
                    setCloseDialogVisible(true);
                  }}
                  className="rounded-2xl overflow-hidden mb-5"
                >
                  <LinearGradient
                    colors={["#24A148", "#167A34"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="py-4 px-4"
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                      <Text className="text-white font-bold ml-2">Cerrar caso</Text>
                    </View>
                    <Text className="text-white/80 text-xs text-center mt-1">
                      Solicita el resumen de solucion antes de cerrar.
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {renderRelatedTickets()}

              <Text className="font-semibold text-gray-900 mb-2">Linea de tiempo</Text>
              {renderTimeline()}
            </>
          )}
        </ScrollView>
      </Modal>

      <Modal
        visible={closeDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCloseDialogVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-2xl p-5">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-gray-900">Cerrar caso</Text>
                <Text className="text-gray-600 mt-1">
                  Escribe un resumen breve de la solucion para dejar claro por que se cierra.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCloseDialogVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={closeNote}
              onChangeText={setCloseNote}
              multiline
              placeholder="Resumen de solucion..."
              className="bg-[#FFFDF6] border border-[#F2DEA2] rounded-xl px-4 py-3 min-h-[120px] text-gray-800 mb-4"
            />

            <TouchableOpacity
              disabled={saving || !closeNote.trim()}
              onPress={() => requestActorForAction("close")}
              className={`rounded-xl py-3 items-center ${closeNote.trim() ? "bg-[#1D7A3A]" : "bg-gray-300"}`}
            >
              <Text className="text-white font-semibold">Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(actorAction)}
        transparent
        animationType="fade"
        onRequestClose={() => setActorAction(null)}
      >
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-2xl p-5 max-h-[78%]">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-gray-900">
                  ¿Quien realiza esta accion?
                </Text>
                <Text className="text-gray-600 mt-1">
                  Selecciona el agente para que el historial quede claro por turno.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActorAction(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={monitors}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  disabled={saving}
                  onPress={async () => {
                    if (actorAction === "update") {
                      await handleAddActivity(item.id);
                    }
                    if (actorAction === "close") {
                      await handleClose(item.id);
                    }
                  }}
                  className="flex-row items-center p-3 rounded-xl border border-[#EFE2B7] bg-[#FFFDF6] mb-2"
                >
                  <AvatarBadge name={item.name} />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 font-semibold">{item.name}</Text>
                    <Text className="text-gray-500 text-xs">
                      {item.rol?.rolName || "Agente"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#A67C00" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 py-6">
                  No se pudo cargar la lista de agentes.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={remindersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemindersVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">
                Recordatorios y avisos
              </Text>
              <TouchableOpacity onPress={() => setRemindersVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View className="border border-[#EFE2B7] rounded-xl p-4 mb-3">
              <Text className="text-gray-500 text-xs">Correo inicial</Text>
              <Text className="text-gray-900 font-semibold mt-1">
                {selectedTicket?.emailNotificationSent
                  ? "Enviado al equipo de soporte"
                  : "Sin confirmacion de envio"}
              </Text>
            </View>

            <View className="border border-[#EFE2B7] rounded-xl p-4 mb-3">
              <Text className="text-gray-500 text-xs">Recordatorios a IT</Text>
              <Text className="text-gray-900 font-semibold mt-1">
                {selectedTicket?.itResponseReminderCount || 0} enviados
              </Text>
              <Text className="text-gray-500 mt-2">
                Ultimo: {formatDate(selectedTicket?.lastItResponseReminderAt) || "No registrado"}
              </Text>
              <Text className="text-gray-500 mt-1">
                Proximo: {formatDate(selectedTicket?.nextItResponseReminderAt) || "No programado"}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {(selectedTicket?.activities || [])
                .filter((activity) => isReminderActivity(activity))
                .slice()
                .reverse()
                .map((activity, index) => (
                  <View
                    key={activity.id || `reminder-${index}`}
                    className="border border-gray-200 rounded-xl p-3 mb-2 bg-gray-50"
                  >
                    <Text className="text-gray-900 font-semibold">
                      Recordatorio enviado
                    </Text>
                    <Text className="text-gray-500 mt-1">
                      {formatDate(activity.createdAt)}
                    </Text>
                  </View>
                ))}
            </ScrollView>

            <View className="border border-[#EFE2B7] rounded-xl p-4">
              <Text className="text-gray-500 text-xs">Estado de respuesta</Text>
              <Text className="text-gray-900 font-semibold mt-1">
                {selectedTicket?.needsItResponse
                  ? "Pendiente respuesta de IT"
                  : "Sin respuesta pendiente"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
