import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Image,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";

type Protocol = {
  id: string;
  title: string;
  description?: string;
  scheduledFor?: string;
  scheduledTimeZone?: string;
};

type Monitor = {
  id: number | string;
  name: string;
  image?: string;
  email?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  protocol: Protocol;
  monitors: Monitor[];
  onSave: (
    answer: "sí" | "no",
    note: string,
    respondedBy: string,
  ) => Promise<void>;
};

export default function ProtocolReminderModal({
  visible,
  onClose,
  protocol,
  monitors,
  onSave,
}: Props) {
  const [answer, setAnswer] = useState<"sí" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [searchMonitor, setSearchMonitor] = useState("");
  const [showResponsableModal, setShowResponsableModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const introAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.98)).current;
  const successScale = useRef(new Animated.Value(0.92)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimers = () => {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  const formattedTime = useMemo(() => currentTime, [currentTime]);
  const scheduledTimeLabel = useMemo(() => {
    if (!protocol.scheduledFor) {
      return null;
    }

    const scheduledDate = new Date(protocol.scheduledFor);
    if (Number.isNaN(scheduledDate.getTime())) {
      return null;
    }

    return scheduledDate.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [protocol.scheduledFor]);

  useEffect(() => {
    if (visible) {
      setAnswer(null);
      setNote("");
      setSelectedMonitor(null);
      setSearchMonitor("");
      setShowResponsableModal(false);
      setShowConfirmModal(false);
      setShowSuccessState(false);
      setIsSubmitting(false);
      setErrorMessage(null);
      clearPendingTimers();
      // Actualizar la hora actual
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(timeStr);

      introAnim.setValue(0);
      cardAnim.setValue(0);
      titleScale.setValue(0.98);
      Animated.parallel([
        Animated.timing(introAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 72,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          tension: 85,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, protocol.id, introAnim, cardAnim, titleScale]);

  useEffect(() => {
    return () => {
      clearPendingTimers();
    };
  }, []);

  const filteredMonitors = monitors.filter((monitor) =>
    monitor.name.toLowerCase().includes(searchMonitor.toLowerCase()),
  );

  const readyToSelectResponsable = answer !== null;

  const handleSendClick = () => {
    if (answer) {
      setShowResponsableModal(true);
    }
  };

  const handleSelectResponsable = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setShowResponsableModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmResponsable = () => {
    if (!selectedMonitor || !answer || isSubmitting) {
      return;
    }

    const run = async () => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await onSave(answer, note.trim(), selectedMonitor.name);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowConfirmModal(false);
        setShowResponsableModal(false);
        setShowSuccessState(true);

        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            tension: 90,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();

        confirmTimeoutRef.current = setTimeout(() => {
          onClose();
          confirmTimeoutRef.current = null;
        }, 700);

        successTimeoutRef.current = setTimeout(() => {
          setShowSuccessState(false);
          successTimeoutRef.current = null;
        }, 900);
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const normalizedMessage = /not pending for this device/i.test(rawMessage)
          ? "Este protocolo ya no está pendiente para este dispositivo. Recarga la pantalla y prueba con el siguiente evento."
          : /HTTP\s+(409|500)\b/i.test(rawMessage)
            ? "El backend rechazó la respuesta de este protocolo. Puede que ya no esté pendiente o que haya cambiado su estado."
          : rawMessage || "No se pudo guardar la respuesta del protocolo.";

        setErrorMessage(normalizedMessage);
        setShowSuccessState(false);
        setShowConfirmModal(false);
        setShowResponsableModal(false);
      } finally {
        setIsSubmitting(false);
      }
    };

    void run();
  };

    return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          className="flex-1 bg-black/60 justify-center px-4"
          style={{ opacity: introAnim }}
        >
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", inset: 0 }}
          />

          <Animated.View
            className="rounded-[28px] bg-white px-4 py-4 shadow-xl max-h-[84%] border border-[#E5E7EB]"
            style={{
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                { scale: titleScale },
              ],
            }}
          >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            <View className="mb-4 rounded-[26px] border border-[#DBEAFE] bg-[#F8FBFF] p-4">
              <View className="flex-row items-start gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]">
                  <Ionicons name="notifications" size={24} color="#1D4ED8" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase font-semibold tracking-[0.22em] text-[#1D4ED8]">
                    Recordatorio de protocolo
                  </Text>
                  <Text className="mt-1 text-[22px] leading-7 font-bold text-[#0F172A]">
                    {protocol.title}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-[#475569]">
                    {protocol.description ||
                      "Responde el protocolo desde este formulario y deja el registro al instante."}
                  </Text>
                  {scheduledTimeLabel ? (
                    <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
                      Hora programada {scheduledTimeLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3 border border-[#E5E7EB]">
                <View className="flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                  <Text className="text-sm font-medium text-[#374151]">
                    {scheduledTimeLabel ? "Disponible desde esa hora" : "Disponible para responder ahora"}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-[#1D4ED8]">
                  {scheduledTimeLabel || formattedTime}
                </Text>
              </View>
            </View>

            {/* Sección de respuesta */}
            <View className="mb-4 rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-[#111827]">
                  ¿Lo realizaste?
                </Text>
                <Text className="text-xs text-[#6B7280]">Elige una opción</Text>
              </View>
              <View className="flex-row gap-2">
                {[
                  { label: "Sí", value: "sí", icon: "checkmark-circle" },
                  { label: "No", value: "no", icon: "close-circle" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setAnswer(option.value as "sí" | "no")}
                    className={`flex-1 rounded-2xl border px-3 py-3 items-center justify-center transition-all ${
                      answer === option.value
                        ? option.value === "sí"
                          ? "border-[#16A34A] bg-[#DCFCE7]"
                          : "border-[#DC2626] bg-[#FEE2E2]"
                        : "border-[#E5E7EB] bg-white"
                    }`}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={
                        answer === option.value
                          ? option.value === "sí"
                            ? "#16A34A"
                            : "#DC2626"
                          : "#9CA3AF"
                      }
                    />
                    <Text
                      className={`text-sm font-semibold mt-1 ${
                        answer === option.value
                          ? option.value === "sí"
                            ? "text-[#16A34A]"
                            : "text-[#DC2626]"
                          : "text-[#4B5563]"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4 rounded-[24px] border border-[#E5E7EB] bg-white p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-sm font-semibold text-[#111827]">
                    Detalles del protocolo
                  </Text>
                  <Text className="text-xs text-[#6B7280] mt-1">
                    Describe lo observado o añade comentarios clave.
                  </Text>
                </View>
                <Text className="text-xs text-[#9CA3AF]">{currentTime}</Text>
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Ej. Se realizó sin novedades, con revisión de seguridad y cierre de área"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                scrollEnabled
                textAlignVertical="top"
                className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-base text-[#1C1C1C]"
                style={{ minHeight: 150, maxHeight: 200 }}
              />
            </View>

            {errorMessage ? (
              <View className="mb-4 rounded-[22px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                <Text className="text-sm font-semibold text-[#B91C1C]">
                  No se pudo guardar la respuesta
                </Text>
                <Text className="mt-1 text-sm leading-5 text-[#7F1D1D]">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Botones de acción */}
            <View className="flex-row gap-3 mt-1 mb-2">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
              >
                <Text className="text-center text-[#6B7280] font-semibold">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendClick}
                disabled={!readyToSelectResponsable || isSubmitting}
                className={`flex-1 rounded-2xl px-4 py-3 flex-row items-center justify-center ${
                  readyToSelectResponsable && !isSubmitting
                    ? "bg-[#006bb3]"
                    : "bg-[#D1D5DB]"
                }`}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={readyToSelectResponsable && !isSubmitting ? "white" : "#9CA3AF"}
                />
                <Text
                  className={`text-center font-semibold ml-2 text-sm ${
                    readyToSelectResponsable && !isSubmitting
                      ? "text-white"
                      : "text-[#9CA3AF]"
                  }`}
                >
                  {isSubmitting ? "Guardando..." : "Enviar Respuesta"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </Animated.View>

        {showSuccessState ? (
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
            style={{
              opacity: successOpacity,
              transform: [{ scale: successScale }],
            }}
          >
            <View className="items-center rounded-[28px] border border-[#DCFCE7] bg-white px-6 py-5 shadow-xl">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7]">
                <Ionicons name="checkmark" size={32} color="#16A34A" />
              </View>
              <Text className="text-lg font-bold text-[#0F172A]">
                Respuesta guardada
              </Text>
              <Text className="mt-1 text-sm text-[#475569]">
                Gracias por responder el protocolo.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Modal para seleccionar responsable */}
        <Modal
          visible={showResponsableModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResponsableModal(false)}
        >
          <View className="flex-1 bg-black/60 justify-center px-4">
            <TouchableWithoutFeedback
              onPress={() => setShowResponsableModal(false)}
            >
              <View className="flex-1 justify-center">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-3xl p-6 shadow-xl max-h-[70%] border border-[#E5E7EB]">
                    <View className="items-center mb-4">
                      <View className="rounded-full bg-[#EFF6FF] p-3 mb-3">
                        <Ionicons
                          name="person-circle"
                          size={30}
                          color="#2563EB"
                        />
                      </View>
                      <Text className="text-lg font-bold text-[#111827]">
                        Selecciona tu nombre
                      </Text>
                      <Text className="text-sm text-[#6B7280] text-center mt-1">
                        Elige quién registra esta respuesta de protocolo.
                      </Text>
                    </View>

                    {/* Buscador */}
                    <View className="flex-row items-center mb-4 border border-[#E5E7EB] rounded-lg px-3 py-2 bg-[#F9F7F1]">
                      <MaterialCommunityIcons
                        name="magnify"
                        size={18}
                        color="#A67C00"
                      />
                      <TextInput
                        value={searchMonitor}
                        onChangeText={setSearchMonitor}
                        placeholder="Buscar persona..."
                        placeholderTextColor="#B8A896"
                        className="flex-1 ml-2 text-sm text-[#1C1C1C]"
                      />
                    </View>

                    {/* Lista de monitores */}
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {filteredMonitors.length === 0 ? (
                        <Text className="text-center text-[#6B7280] py-4">
                          No hay personas disponibles.
                        </Text>
                      ) : (
                        filteredMonitors.map((item) => (
                          <TouchableOpacity
                            key={String(item.id)}
                            onPress={() => handleSelectResponsable(item)}
                            className="flex-row items-center px-4 py-3 rounded-xl mb-2 bg-[#F9F7F1]"
                          >
                            <View className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-[#E5E7EB] items-center justify-center">
                              <Image
                                source={{
                                  uri: item.image?.startsWith("http")
                                    ? item.image
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        item.name,
                                      )}&background=E5E7EB&color=3B4252`,
                                }}
                                className="w-full h-full"
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="font-semibold text-[#1C1C1C] text-base">
                                {item.name}
                              </Text>
                              {item.email ? (
                                <Text className="text-xs text-[#6B7280] mt-1">
                                  {item.email}
                                </Text>
                              ) : null}
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>

                    <TouchableOpacity
                      onPress={() => setShowResponsableModal(false)}
                      className="mt-4 rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3"
                    >
                      <Text className="text-center text-[#6B7280] font-semibold">
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </Modal>

        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View className="flex-1 bg-black/60 justify-center px-4">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl p-6 shadow-xl border border-[#E5E7EB]">
                <View className="items-center mb-5">
                  <View className="w-20 h-20 rounded-full overflow-hidden bg-[#F8FAFC] items-center justify-center mb-4">
                    {selectedMonitor?.image ? (
                      <Image
                        source={{
                          uri: selectedMonitor.image.startsWith("http")
                            ? selectedMonitor.image
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMonitor.name)}&background=EFF6FF&color=2563EB`,
                        }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Ionicons
                        name="person-circle"
                        size={48}
                        color="#2563EB"
                      />
                    )}
                  </View>
                  <Text className="text-lg font-bold text-[#111827] text-center">
                    Confirmar responsable
                  </Text>
                  <Text className="text-sm text-[#6B7280] text-center mt-2">
                    Confirmas que esta respuesta de protocolo quedará registrada
                    por:
                  </Text>
                  <Text className="text-base font-semibold text-[#111827] text-center mt-3">
                    {selectedMonitor?.name}
                  </Text>
                </View>

              <TouchableOpacity
                onPress={() => {
                  handleConfirmResponsable();
                }}
                disabled={isSubmitting}
                className="rounded-2xl bg-[#006bb3] px-4 py-3 mb-3"
                activeOpacity={0.85}
              >
                <Text className="text-center font-semibold text-white">
                  {isSubmitting ? "Guardando..." : "Confirmar y guardar"}
                </Text>
              </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
                  activeOpacity={0.85}
                >
                  <Text className="text-center font-semibold text-[#6B7280]">
                    Volver
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </Modal>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
