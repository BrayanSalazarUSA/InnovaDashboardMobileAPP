import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

type Property = {
  id: string;
  name: string;
};

type Props = {
  label?: string;
  properties: Property[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function PropertyPicker({
  label = "Property",
  properties,
  selectedId,
  onSelect,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProperty = properties.find((p) => String(p.id) === String(selectedId));
  const filtered = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    onSelect(String(id));
    setVisible(false);
    setSearch("");
  };

  return (
    <View>
      {/* Label */}
      <Text className="font-semibold text-[#A67C00] mb-1">{label}</Text>

      {/* Selector principal */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-3 mb-4"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 3,
        }}
      >
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="office-building" size={20} color="#A67C00" />
          <Text className={`${selectedProperty ? "text-gray-800" : "text-gray-400"} text-base`}>
            {selectedProperty ? selectedProperty.name : "Select property"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color="#A67C00" />
      </TouchableOpacity>

      {/* Modal con buscador */}
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View className="flex-1 bg-black/40 justify-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-2xl p-4 max-h-[70%]">
                {/* Encabezado */}
                <View className="flex-row items-center mb-3 border border-[#F2DEA2] rounded-lg px-3 py-2 bg-[#fffbe6]">
                  <MaterialCommunityIcons name="magnify" size={20} color="#A67C00" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search property..."
                    placeholderTextColor="#b5a76a"
                    className="flex-1 ml-2 text-base text-gray-700"
                  />
                </View>

                {/* Lista */}
                {filtered.length === 0 ? (
                  <Text className="text-center text-gray-400 py-4">
                    No properties found
                  </Text>
                ) : (
                  <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelect(item.id)}
                        className={`py-3 px-3 rounded-lg mb-1 ${
                          String(item.id) === String(selectedId) ? "bg-[#F8F3DA]" : "bg-white"
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            String(item.id) === String(selectedId)
                              ? "text-[#A67C00] font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
