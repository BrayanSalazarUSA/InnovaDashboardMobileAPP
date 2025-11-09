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
};

interface Props {
  followings: Following[];
  setFollowings: React.Dispatch<React.SetStateAction<Following[]>>;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CameraFollowings({ followings, setFollowings }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [temp, setTemp] = useState<Following>({
    camera: "",
    description: "",
    time: "",
  });

  const handleConfirm = (date: Date) => {
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    setTemp((prev) => ({ ...prev, time: `${hh}:${mm}` }));
    setPickerVisible(false);
  };

  const openNew = () => {
    setTemp({ camera: "", description: "", time: "" });
    setEditingIndex(null);
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    setTemp(followings[index]);
    setEditingIndex(index);
    setModalVisible(true);
  };

  const saveFollowing = () => {
    if (!temp.camera.trim()) return;
    const updated = [...followings];
    if (editingIndex !== null) updated[editingIndex] = temp;
    else updated.push(temp);
    setFollowings(updated);
    setModalVisible(false);
    setEditingIndex(null);
    setTemp({ camera: "", description: "", time: "" });
  };

  const removeFollowing = (idx: number) => {
    setFollowings(followings.filter((_, i) => i !== idx));
  };

  return (
    <View className="mb-6">
      <Text className="font-bold text-[#A67C00] mb-3 text-base">
        Seguimiento de Cámaras
      </Text>

      {followings.length === 0 ? (
        <Text className="text-gray-500 italic text-sm mb-3">
          No hay seguimientos aún.
        </Text>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-60"
        >
          {followings.map((f, i) => (
            <View
              key={i}
              className="bg-[#fffbe6] border border-[#F2DEA2] rounded-2xl px-4 py-3 mb-3"
            >
              {/* Encabezado */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-[#A67C00] font-semibold">
                  Cámara #{i + 1}
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={() => openEdit(i)} activeOpacity={0.8}>
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={20}
                      color="#A67C00"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeFollowing(i)} activeOpacity={0.8}>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color="#E53E3E"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Datos */}
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base mb-0.5">
                    {f.camera || "Cámara sin nombre"}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {f.description || "Sin descripción"}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={18}
                    color="#A67C00"
                  />
                  <Text className="text-[#A67C00] text-sm ml-1">
                    {f.time || "Sin hora"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Botón agregar */}
      <TouchableOpacity
        onPress={openNew}
        className="flex-row items-center justify-center border border-[#D4B15F] rounded-2xl bg-[#fffbe6] py-3 mt-3 shadow-sm"
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color="#A67C00"
        />
        <Text className="text-[#A67C00] font-semibold ml-2">
          Agregar seguimiento
        </Text>
      </TouchableOpacity>

      {/* Modal agregar/editar */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/40 px-5">
          <View className="bg-[#fffbe6] rounded-3xl border border-[#F2DEA2] p-5 shadow-lg">
            <Text className="text-[#A67C00] font-bold text-lg mb-4">
              {editingIndex !== null ? "Editar seguimiento" : "Nuevo seguimiento"}
            </Text>

            <TextInput
              value={temp.camera}
              onChangeText={(t) => setTemp({ ...temp, camera: t })}
              placeholder="Nombre de cámara"
              placeholderTextColor="#bfa86a"
              className="bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3 text-gray-800"
            />

            <TextInput
              value={temp.description}
              onChangeText={(t) => setTemp({ ...temp, description: t })}
              placeholder="Descripción"
              placeholderTextColor="#bfa86a"
              multiline
              className="bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3 text-gray-800"
            />

            <TouchableOpacity
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
              className="flex-row items-center justify-between bg-white border border-[#F2DEA2] rounded-xl px-3 py-2 mb-3"
            >
              <Text className="text-gray-700 font-medium">
                {temp.time ? `Hora seleccionada: ${temp.time}` : "Seleccionar hora"}
              </Text>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#A67C00" />
            </TouchableOpacity>

            {/* Botones */}
            <View className="flex-row justify-end mt-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 rounded-xl"
              >
                <Text className="text-gray-600 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveFollowing}
                className="ml-2 bg-[#A67C00] px-5 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold">
                  {editingIndex !== null ? "Guardar cambios" : "Guardar"}
                </Text>
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
          headerTextIOS="Selecciona la hora"
          confirmTextIOS="Aceptar"
          cancelTextIOS="Cancelar"
        />
      </Modal>
    </View>
  );
}
