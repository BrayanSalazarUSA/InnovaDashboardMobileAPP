import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

type Props = {
  visible: boolean;
  onClose: () => void;
  openBuilding: boolean;
  setOpenBuilding: (open: boolean) => void;
  selectedBuilding: any;
  setSelectedBuilding: (value: any) => void;
  filteredBuildings: { label: string; value: any }[];
  openFloor: boolean;
  setOpenFloor: (open: boolean) => void;
  selectedFloor: any;
  setSelectedFloor: (value: any) => void;
  confirmLocation: () => void;
};

export default function LocationSelectionModal({
  visible,
  onClose,
  openBuilding,
  setOpenBuilding,
  selectedBuilding,
  setSelectedBuilding,
  filteredBuildings,
  openFloor,
  setOpenFloor,
  selectedFloor,
  setSelectedFloor,
  confirmLocation,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 justify-center px-6">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-lg font-bold text-center mb-4 text-[#A67C00]">
                Selecciona ubicación
              </Text>

              {/* Selector de edificio */}
              <View className="mb-4">
                <Text className="font-semibold text-[#A67C00] mb-1">
                  Edificio o zona
                </Text>
                <View className="flex-row items-center border border-[#F2DEA2] bg-[#fffbe6] rounded-xl px-3 py-1.5">
                  <MaterialCommunityIcons
                    name="office-building-outline"
                    size={22}
                    color="#A67C00"
                  />
                  <View className="flex-1 ml-2">
                    <DropDownPicker
                      open={openBuilding}
                      setOpen={setOpenBuilding}
                      value={selectedBuilding}
                      setValue={setSelectedBuilding}
                      items={filteredBuildings}
                      placeholder="Selecciona edificio o zona"
                      style={{
                        borderWidth: 0,
                        backgroundColor: "transparent",
                        minHeight: 40,
                      }}
                      dropDownContainerStyle={{
                        borderColor: "#F2DEA2",
                        backgroundColor: "#fffbe6",
                        borderRadius: 12,
                      }}
                      textStyle={{
                        color: "#4a4a4a",
                        fontSize: 15,
                      }}
                   //   listMode="SCROLLVIEW"
                      zIndex={2000}
                    />
                  </View>
                </View>
              </View>

              {/* Selector de piso */}
              {selectedBuilding && (
                <View className="mb-4">
                  <Text className="font-semibold text-[#A67C00] mb-1">
                    Piso
                  </Text>
                  <View className="flex-row items-center border border-[#F2DEA2] bg-[#fffbe6] rounded-xl px-3 py-1.5">
                    <MaterialCommunityIcons
                      name="stairs-up"
                      size={22}
                      color="#A67C00"
                    />
                    <View className="flex-1 ml-2">
                      <DropDownPicker
                        open={openFloor}
                        setOpen={setOpenFloor}
                        value={selectedFloor}
                        setValue={setSelectedFloor}
                     items={Array.from({ length: 3 }, (_, i) => ({
  key: `floor-${i + 1}`,   // ← clave única
  label: `Piso ${i + 1}`,
  value: i + 1,
}))}
                        placeholder="Selecciona piso"
                        style={{
                          borderWidth: 0,
                          backgroundColor: "transparent",
                          minHeight: 40,
                        }}
                        dropDownContainerStyle={{
                          borderColor: "#F2DEA2",
                          backgroundColor: "#fffbe6",
                          borderRadius: 12,
                        }}
                        textStyle={{
                          color: "#4a4a4a",
                          fontSize: 15,
                        }}
                        listMode="SCROLLVIEW"
                        zIndex={1000}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Botones */}
              <View className="flex-row justify-between mt-4">
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-[#E53E3E] font-semibold text-base">
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmLocation}
                  className="bg-[#A67C00] px-6 py-2 rounded-xl"
                >
                  <Text className="text-white font-semibold text-base">
                    Confirmar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}