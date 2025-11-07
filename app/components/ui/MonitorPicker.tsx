import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

type Monitor = {
  id: number;
  name: string;
  email: string;
  image?: string;
  rol?: {
    id: number;
    rolName: string;
  };
  numOfReportsUser?: number;
  numOfCollaborations?: number;
};

type Props = {
  label?: string;
  monitors: Monitor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export default function MonitorPicker({
  label = "Monitor",
  monitors,
  selectedId,
  onSelect,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selectedMonitor = monitors.find((m) => m.id === selectedId);
  const filtered = monitors.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
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

      {/* Caja del selector */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between border border-[#F2DEA2] rounded-xl bg-[#fffbe6] px-4 py-3 mb-4"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 3,
        }}
      >
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="account-circle-outline" size={22} color="#A67C00" />
          <Text className={`${selectedMonitor ? "text-gray-800" : "text-gray-400"} text-base`}>
            {selectedMonitor ? selectedMonitor.name : "Select monitor"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color="#A67C00" />
      </TouchableOpacity>

      {/* Modal con buscador y lista */}
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
                  <MaterialCommunityIcons name="magnify" size={20} color="#A67C00" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search monitor..."
                    placeholderTextColor="#b5a76a"
                    className="flex-1 ml-2 text-base text-gray-700"
                  />
                </View>

                {/* Lista */}
                {filtered.length === 0 ? (
                  <Text className="text-center text-gray-400 py-4">
                    No monitors found
                  </Text>
                ) : (
                  <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelect(item.id)}
                        className={`flex-row items-center py-3 px-3 rounded-lg mb-1 ${
                          item.id === selectedId ? "bg-[#F8F3DA]" : "bg-white"
                        }`}
                      >
                        {/* Avatar */}
                        <Image
                          source={{
                            uri: item.image
                              ? `https://tu-servidor.com/${item.image}`
                              : "https://ui-avatars.com/api/?name=" + encodeURIComponent(item.name),
                          }}
                          className="w-10 h-10 rounded-full mr-3"
                        />

                        {/* Info */}
                        <View className="flex-1">
                          <Text
                            className={`text-base ${
                              item.id === selectedId
                                ? "text-[#A67C00] font-semibold"
                                : "text-gray-800"
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {item.rol?.rolName ?? "—"} • {item.numOfReportsUser ?? 0} reports
                          </Text>
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
