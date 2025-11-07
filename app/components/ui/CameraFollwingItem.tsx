import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Props = {
  index: number;
  cameraValue: string;
  descriptionValue: string;
  timeValue: string;
  onCameraChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onTimeChange: (val: string) => void;
  onRemove: () => void;
  showRemove: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CameraFollowingItem({
  index,
  cameraValue,
  descriptionValue,
  timeValue,
  onCameraChange,
  onDescriptionChange,
  onTimeChange,
  onRemove,
  showRemove,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleConfirm = (date: Date) => {
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    onTimeChange(`${hh}:${mm}`);
    setPickerVisible(false);
  };

  return (
    <View className="bg-[#fffbe6] border border-[#F2DEA2] rounded-2xl px-4 py-3 mb-3">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[#A67C00] font-semibold">Cámara #{index + 1}</Text>
        {showRemove && (
          <TouchableOpacity
            onPress={onRemove}
            className="flex-row items-center"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53E3E" />
          </TouchableOpacity>
        )}
      </View>

      {/* Row content */}
      <View className="flex-row items-center gap-3">
        {/* Identificador de cámara */}
        <View className="flex-1">
          <TextInput
            value={cameraValue}
            onChangeText={onCameraChange}
            placeholder="Cámara 01"
            placeholderTextColor="#bfa86a"
            className="bg-white px-3 py-2.5 rounded-xl border border-[#F2DEA2] text-gray-800 font-medium"
          />
        </View>

        {/* Descripción */}
        <View className="flex-1">
          <TextInput
            value={descriptionValue}
            onChangeText={onDescriptionChange}
            placeholder="Descripción"
            placeholderTextColor="#bfa86a"
            className="bg-white px-3 py-2.5 rounded-xl border border-[#F2DEA2] text-gray-800 font-medium"
          />
        </View>

        {/* Hora */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          className="bg-[#fff] border border-[#F2DEA2] rounded-xl p-2.5 flex-row items-center justify-center w-16"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="clock-outline"
            size={22}
            color="#A67C00"
          />
        </TouchableOpacity>
      </View>

      {/* Hora seleccionada (debajo si existe) */}
      {timeValue ? (
        <Text className="text-[#A67C00] text-sm mt-1 ml-auto">
          ⏰ {timeValue}
        </Text>
      ) : null}

      {/* Time picker modal */}
      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
        is24Hour
        display={Platform.OS === "android" ? "clock" : undefined}
        headerTextIOS="Selecciona la hora"
        confirmTextIOS="OK"
        cancelTextIOS="Cancelar"
      />
    </View>
  );
}
