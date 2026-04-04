import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Following = {
  camera?: string;
  time?: string;
  description?: string;
  category?: string;
  index?: number;
};

type Props = {
  followings: Following[];
  setFollowings: (f: Following[]) => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CameraFollowingsForm({
  followings,
  setFollowings,
}: Props) {
  const [temp, setTemp] = useState<Following>({});
  const [showModal, setShowModal] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const categories = [
    "Hora de EE.UU.",
    "Hora Colombia",
    "Hora del Playback",
    "Hora de la Cámara",
  ];

  const openNew = () => {
    setTemp({});
    setShowModal(true);
  };

  const openEdit = (index: number) => {
    setTemp({ ...followings[index], index });
    setShowModal(true);
  };

  const removeFollowing = (index: number) => {
    const updated = [...followings];
    updated.splice(index, 1);
    setFollowings(updated);
  };

  const saveFollowing = () => {
    if (temp.index !== undefined) {
      const updated = [...followings];
      updated[temp.index] = temp;
      setFollowings(updated);
    } else {
      setFollowings((prev) => [...prev, temp]);
    }
    setShowModal(false);
  };

  const handleConfirmTime = (date: Date) => {
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const formatted = `${hh}:${mm}`;
    setTemp({ ...temp, time: formatted });
    setTimePickerVisible(false);
  };

  return (
    <View className="rounded-2xl p-2 mt-2">
      <Text className="text-[#A67C00] font-semibold text-base mb-2 flex-row items-center">
        <MaterialCommunityIcons
          name="cctv"
          size={18}
          color="#A67C00"
          style={{ marginRight: 6 }}
        />
        Seguimientos de cámaras
      </Text>

      {followings.length === 0 ? (
        <Text className="text-gray-500 italic text-sm mt-1 mb-3">
          No hay seguimientos aún.
        </Text>
      ) : (
        <View>
          {followings.map((f, i) => (
            <View
              key={i}
              className="bg-[#FFFBE6] border border-[#F2DEA2] rounded-xl p-3 mb-3 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="cctv"
                    size={18}
                    color="#A67C00"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-gray-900 font-semibold text-sm">
                    {f.camera || `Cámara #${i + 1}`}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color="#6A5F3B"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs text-gray-700 font-medium">
                    {f.time || "Sin hora"}
                  </Text>
                </View>
              </View>

              <Text className="text-gray-700 text-xs mb-1">
                {f.description || "Sin descripción registrada."}
              </Text>

              {f.category ? (
                <View className="self-start px-2 py-0.5 rounded-full bg-[#EDE8D3]">
                  <Text className="text-[11px] text-[#6A5F3B] font-medium">
                    {f.category}
                  </Text>
                </View>
              ) : (
                <Text className="text-[11px] text-gray-500 italic">
                  Sin tipo de hora
                </Text>
              )}

              <View className="flex-row justify-end items-center mt-1">
                <TouchableOpacity
                  onPress={() => openEdit(i)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color="#A67C00"
                    style={{ marginRight: 10 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeFollowing(i)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color="#E53E3E"
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={openNew}
        className="flex-row items-center justify-center border border-[#D4B15F] rounded-xl bg-[#FFFBE6] py-2.5 mt-1"
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={20}
          color="#A67C00"
        />
        <Text className="text-[#A67C00] font-semibold ml-1 text-sm">
          Agregar seguimiento
        </Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-5">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-2xl p-5 shadow-md">
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text className="text-[#A67C00] font-semibold text-lg mb-3 flex-row items-center">
                    {temp.index !== undefined
                      ? "Editar seguimiento"
                      : "Nuevo seguimiento"}
                  </Text>

                  {/* Cámara */}
                  <View className="mb-3">
                    <View className="flex-row items-center mb-1">
                      <MaterialCommunityIcons
                        name="video-outline"
                        size={18}
                        color="#A67C00"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-[#A67C00] font-medium">Cámara</Text>
                    </View>
                    <TextInput
                      value={temp.camera || ""}
                      onChangeText={(v) => setTemp({ ...temp, camera: v })}
                      placeholder="Nombre o número de cámara"
                      placeholderTextColor="#b5a76a"
                      className="border border-[#F2DEA2] bg-[#fffbe6] rounded-xl px-4 py-2.5 text-gray-800"
                    />
                  </View>

                  {/* Hora */}
                  <View className="mb-3">
                    <View className="flex-row items-center mb-1">
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={18}
                        color="#A67C00"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-[#A67C00] font-medium">Hora</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTimePickerVisible(true)}
                      activeOpacity={0.9}
                      className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-2.5"
                    >
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name="clock-time-four-outline"
                          size={20}
                          color="#A67C00"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className={`${
                            temp.time ? "text-gray-800" : "text-gray-400"
                          } text-base`}
                        >
                          {temp.time || "Seleccionar hora"}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={22}
                        color="#A67C00"
                      />
                    </TouchableOpacity>

                    <DateTimePickerModal
                      isVisible={timePickerVisible}
                      mode="time"
                      onConfirm={handleConfirmTime}
                      onCancel={() => setTimePickerVisible(false)}
                      is24Hour
                      display={Platform.OS === "android" ? "clock" : undefined}
                      headerTextIOS="Selecciona la hora"
                      confirmTextIOS="OK"
                      cancelTextIOS="Cancelar"
                    />
                  </View>

                  {/* Descripción */}
                  <View className="mb-3">
                    <View className="flex-row items-center mb-1">
                      <MaterialCommunityIcons
                        name="text-long"
                        size={18}
                        color="#A67C00"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-[#A67C00] font-medium">
                        Descripción
                      </Text>
                    </View>
                    <TextInput
                      value={temp.description || ""}
                      onChangeText={(v) => setTemp({ ...temp, description: v })}
                      placeholder="Detalles del seguimiento..."
                      placeholderTextColor="#b5a76a"
                      multiline
                      className="border border-[#F2DEA2] bg-[#fffbe6] rounded-xl px-4 py-2.5 text-gray-800 min-h-[70px]"
                    />
                  </View>

                  {/* Categoría */}
                  <View className="mb-2">
                    <View className="flex-row items-center mb-1">
                      <MaterialCommunityIcons
                        name="clock-time-four-outline"
                        size={18}
                        color="#A67C00"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-[#A67C00] font-medium">
                        Tipo de hora
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowCategoryMenu(!showCategoryMenu)}
                      activeOpacity={0.9}
                      className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-2.5"
                    >
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={20}
                          color="#A67C00"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className={`${
                            temp.category ? "text-gray-800" : "text-gray-400"
                          } text-base`}
                        >
                          {temp.category || "Seleccionar tipo"}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={showCategoryMenu ? "chevron-up" : "chevron-down"}
                        size={22}
                        color="#A67C00"
                      />
                    </TouchableOpacity>
                  </View>

                  {showCategoryMenu && (
                    <View className="bg-[#FFFBEB] border border-[#F2DEA2] rounded-xl mb-3 shadow-sm">
                      {categories.map((cat, index) => {
                        const iconMap: Record<string, string> = {
                          "Hora de EE.UU.": "earth",
                          "Hora Colombia": "flag",
                          "Hora del Playback": "play-circle-outline",
                          "Hora de la Cámara": "cctv",
                        };
                        const isLast = index === categories.length - 1;
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => {
                              setTemp({ ...temp, category: cat });
                              setShowCategoryMenu(false);
                            }}
                            activeOpacity={0.8}
                            className={`flex-row items-center px-3 py-2 ${
                              !isLast ? "border-b border-[#E4D8B4]" : ""
                            }`}
                          >
                            <MaterialCommunityIcons
                              name={iconMap[cat]}
                              size={18}
                              color="#A67C00"
                              style={{ marginRight: 8 }}
                            />
                            <Text className="text-sm text-gray-800">{cat}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Botones */}
                  <View className="flex-row justify-end mt-4">
                    <TouchableOpacity
                      onPress={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 mr-2"
                    >
                      <Text className="text-gray-600 font-medium">
                        Cancelar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={saveFollowing}
                      className="px-5 py-2 rounded-lg bg-[#A67C00]"
                    >
                      <Text className="text-white font-semibold">Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
