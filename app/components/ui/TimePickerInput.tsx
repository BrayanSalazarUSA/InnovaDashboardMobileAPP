// components/ui/TimePickerInput.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Props = {
  value?: string; // "HH:mm"
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function TimePickerInput({
  value,
  onChange,
  placeholder = "HH:mm",
  label,
  icon,
}: Props) {
  const [visible, setVisible] = useState(false);

  const handleConfirm = (date: Date) => {
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    onChange(`${hh}:${mm}`);
    setVisible(false);
  };

  const handleCancel = () => setVisible(false);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="font-semibold text-[#A67C00] mb-1">{label}</Text>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-3"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-2">
          {icon ? (
            icon
          ) : (
            <MaterialCommunityIcons
              name="clock-outline"
              size={22}
              color="#A67C00"
            />
          )}
          <Text
            className={`${
              value ? "text-gray-800" : "text-gray-400"
            } text-base font-medium`}
          >
            {value ?? placeholder}
          </Text>
        </View>

        <MaterialCommunityIcons name="chevron-down" size={22} color="#A67C00" />
      </TouchableOpacity>

      {/* Picker modal */}
      <DateTimePickerModal
        isVisible={visible}
        mode="time"
        date={
          value
            ? (() => {
                const [hh, mm] = value.split(":").map(Number);
                const d = new Date();
                d.setHours(hh, mm, 0, 0);
                return d;
              })()
            : new Date()
        }
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        is24Hour={true}
        headerTextIOS="Selecciona la hora"
        confirmTextIOS="OK"
        cancelTextIOS="Cancelar"
        display={Platform.OS === "android" ? "clock" : undefined}
      />
    </View>
  );
}
