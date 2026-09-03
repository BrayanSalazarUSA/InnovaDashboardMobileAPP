import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving?: boolean;
};

const SUGGESTIONS = ["Mesa 1", "Mesa 2", "Mesa 3", "Recepción"];

export default function DeviceIdentitySetupModal({
  visible,
  value,
  onChange,
  onSave,
  isSaving = false,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0.96)).current;

  const canSave = useMemo(() => value.trim().length >= 2, [value]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    opacity.setValue(0);
    card.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(card, {
        toValue: 1,
        tension: 84,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, card]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} />

        <Animated.View style={[styles.card, { transform: [{ scale: card }] }]}>
          <View className="mb-4 flex-row items-start gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7E3] border border-[#E8C56B]">
              <Ionicons name="tablet-landscape" size={22} color="#C77D00" />
            </View>
            <View className="flex-1">
              <Text className="text-[22px] font-bold leading-7 text-[#0F172A]">
                Nombra este dispositivo
              </Text>
              <Text className="mt-2 text-sm leading-5 text-[#475569]">
                Usa algo fácil de reconocer como Mesa 1, Mesa 2 o Recepción.
                Solo te lo pediremos una vez.
              </Text>
            </View>
          </View>

          <View className="rounded-[22px] border border-[#DBEAFE] bg-[#F8FBFF] p-4">
            <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D4ED8]">
              Nombre visible
            </Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Mesa 1"
              placeholderTextColor="#94A3B8"
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSave && !isSaving) {
                  void Haptics.selectionAsync();
                  onSave();
                }
              }}
              className="mt-3 rounded-2xl border border-[#D6E4FF] bg-white px-4 py-4 text-base text-[#0F172A]"
              style={{ minHeight: 54 }}
            />

            <View className="mt-3 flex-row flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => {
                const active =
                  value.trim().toLowerCase() === suggestion.toLowerCase();
                return (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => onChange(suggestion)}
                    className={`rounded-full px-3 py-2 ${active ? "bg-[#1D4ED8]" : "bg-white"}`}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? "#1D4ED8" : "#E2E8F0",
                    }}
                  >
                    <Text
                      className={`text-xs font-semibold ${active ? "text-white" : "text-[#475569]"}`}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                void Haptics.selectionAsync();
                onSave();
              }}
              disabled={!canSave || isSaving}
              className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${canSave && !isSaving ? "bg-[#0F172A]" : "bg-[#CBD5E1]"}`}
            >
              <Text className="text-base font-semibold text-white">
                {isSaving ? "Guardando..." : "Guardar nombre"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
