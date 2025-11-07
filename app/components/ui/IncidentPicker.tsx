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

type Incident = {
  id: number;
  incident: string;
  translate?: string;
  deleted?: boolean;
};

type Props = {
  label?: string;
  incidents: Incident[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export default function IncidentPicker({
  label = "Incident Type",
  incidents,
  selectedId,
  onSelect,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selectedIncident = incidents.find((i) => i.id === selectedId);
  const filtered = incidents.filter(
    (i) =>
      i.incident.toLowerCase().includes(search.toLowerCase()) ||
      i.translate?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: number) => {
    onSelect(id);
    setVisible(false);
    setSearch("");
  };

  return (
    <View>
      {/* Label */}
      <Text className="font-semibold text-[#A67C00] mb-1">{label}</Text>

      {/* Caja visible */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.9}
        className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-3 mb-4"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 3,
        }}
      >
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={22}
            color="#A67C00"
          />
          <Text
            className={`${
              selectedIncident ? "text-gray-800" : "text-gray-400"
            } text-base`}
          >
            {selectedIncident
              ? selectedIncident.translate || selectedIncident.incident
              : "Select type"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color="#A67C00" />
      </TouchableOpacity>

      {/* Modal */}
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
                {/* Buscador */}
                <View className="flex-row items-center mb-3 border border-[#F2DEA2] rounded-lg px-3 py-2 bg-[#fffbe6]">
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color="#A67C00"
                  />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search incident..."
                    placeholderTextColor="#b5a76a"
                    className="flex-1 ml-2 text-base text-gray-700"
                  />
                </View>

                {/* Lista */}
                {filtered.length === 0 ? (
                  <Text className="text-center text-gray-400 py-4">
                    No incidents found
                  </Text>
                ) : (
                  <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelect(item.id)}
                        className={`p-3 rounded-lg mb-1 ${
                          item.id === selectedId
                            ? "bg-[#F8F3DA]"
                            : "bg-white"
                        }`}
                      >
                        <View className="flex-row items-center gap-2">
                          <MaterialCommunityIcons
                            name="alert-decagram-outline"
                            size={20}
                            color="#A67C00"
                          />
                          <View>
                            <Text
                              className={`text-base ${
                                item.id === selectedId
                                  ? "text-[#A67C00] font-semibold"
                                  : "text-gray-800"
                              }`}
                            >
                              {item.translate ?? item.incident}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {item.incident}
                            </Text>
                          </View>
                        </View>
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
