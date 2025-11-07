import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Following = {
  camera: string;
  description: string;
  time: string;
  hourType: string;
};

export default function CameraFollowings() {
  const [followings, setFollowings] = useState<Following[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Estado temporal para el modal
  const [temp, setTemp] = useState<Following>({
    camera: "",
    description: "",
    time: "",
    hourType: "Hora Colombia",
  });

  const addFollowing = () => {
    if (!temp.camera && !temp.description) return;
    setFollowings((prev) => [...prev, temp]);
    setTemp({ camera: "", description: "", time: "", hourType: "Hora Colombia" });
    setModalVisible(false);
  };

  const handleConfirm = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    setTemp((prev) => ({ ...prev, time: `${hh}:${mm}` }));
    setPickerVisible(false);
  };

  const removeFollowing = (idx: number) => {
    setFollowings((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <View className="mb-6">
      <Text className="font-semibold text-[#A67C00] mb-2">
        Seguimiento de Cámaras
      </Text>

      {/* Lista resumida */}
      {followings.length === 0 ? (
        <Text className="text-gray-500 italic text-sm mb-3">
          No hay seguimientos aún.
        </Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-48 border border-[#F2DEA2] rounded-2xl bg-[#fffbe6] p-2"
        >
          {followings.map((f, i) => (
            <View
              key={i}
              className="flex-row items-center justify-between bg-white rounded-xl px-3 py-2 mb-2 shadow-sm"
            >
              <View className="flex-1">
                <Text className="text-[#A67C00] font-semibold text-sm">
                  {f.time || "Sin hora"} • {f.hourType}
                </Text>
                <Text className="text-gray-700 text-sm font-medium" numberOfLines={1}>
                  {f.camera} — {f.description}
                </Text>
              </View>

              <TouchableOpacity onPress={() => removeFollowing(i)}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#E53E3E"
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Botón agregar */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center justify-center border-[1px] border-[#c9a13b9d] rounded-xl bg-[#fffbe6] py-3 mt-3"
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color="#C9A13B"
        />
        <Text className="text-[#C9A13B] font-semibold ml-2">
          Agregar seguimiento
        </Text>
      </TouchableOpacity>

      {/* Modal de formulario */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/40 px-4">
          <View className="bg-[#fffbe6] rounded-2xl border border-[#F2DEA2] p-5">
            <Text className="text-[#A67C00] font-bold text-lg mb-3">
              Nuevo Seguimiento
            </Text>

            {/* Cámara */}
            <TextInput
              value={temp.camera}
              onChangeText={(t) => setTemp({ ...temp, camera: t })}
              placeholder="Cámara (Ej: Cámara 03)"
              placeholderTextColor="#bfa86a"
              className="bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3 text-gray-800"
            />

            {/* Descripción */}
            <TextInput
              value={temp.description}
              onChangeText={(t) => setTemp({ ...temp, description: t })}
              placeholder="Descripción del evento..."
              placeholderTextColor="#bfa86a"
              multiline
              numberOfLines={3}
              className="bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3 text-gray-800"
            />

            {/* Hora */}
            <TouchableOpacity
              onPress={() => setPickerVisible(true)}
              className="flex-row items-center justify-between bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3"
            >
              <Text className="text-gray-700">
                {temp.time ? `Hora: ${temp.time}` : "Seleccionar hora"}
              </Text>
              <MaterialCommunityIcons
                name="clock-outline"
                size={22}
                color="#A67C00"
              />
            </TouchableOpacity>

            {/* Selector de tipo de hora */}
            <View className="bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3">
              <Text className="text-[#A67C00] font-semibold mb-1 text-sm">
                Tipo de hora
              </Text>
              {["Hora EE.UU", "Hora Colombia", "Hora Cámara en Vivo", "Hora Playback"].map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setTemp({ ...temp, hourType: option })}
                    className="flex-row items-center mb-1"
                  >
                    <MaterialCommunityIcons
                      name={
                        temp.hourType === option
                          ? "radiobox-marked"
                          : "radiobox-blank"
                      }
                      size={18}
                      color="#A67C00"
                    />
                    <Text className="ml-2 text-gray-800">{option}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Botones */}
            <View className="flex-row justify-end mt-2">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2"
              >
                <Text className="text-gray-600 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addFollowing}
                className="ml-2 bg-[#A67C00] px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold">Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Selector de hora */}
        <DateTimePickerModal
          isVisible={pickerVisible}
          mode="time"
          onConfirm={handleConfirm}
          onCancel={() => setPickerVisible(false)}
          is24Hour
          display={Platform.OS === "android" ? "clock" : undefined}
        />
      </Modal>
    </View>
  );
}
