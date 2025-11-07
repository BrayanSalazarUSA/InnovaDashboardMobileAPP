import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, View } from "react-native";

type Props = {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  maxLength?: number;
};

export default function TextAreaInput({
  value,
  onChange,
  placeholder = "Escribe una breve descripción...",
  label,
  icon,
  maxLength = 500,
}: Props) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="font-semibold text-[#A67C00] mb-1">{label}</Text>
      ) : null}

      <View
        className="flex-row items-start border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-3 py-3"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Icono a la izquierda */}
        <View className="pt-1 mr-2">
          {icon ?? (
            <MaterialCommunityIcons
              name="note-text-outline"
              size={20}
              color="#A67C00"
            />
          )}
        </View>

        {/* Campo de texto */}
        <TextInput
          multiline
          numberOfLines={5}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          textAlignVertical="top"
          className="flex-1 text-gray-800 text-base"
          placeholderTextColor="#a3a3a3"
          style={{
            fontFamily: "System",
            minHeight: 100,
          }}
        />
      </View>

      {/* Contador opcional */}
      <Text className="text-right text-xs text-gray-500 mt-1">
        {value?.length ?? 0}/{maxLength}
      </Text>
    </View>
  );
}
