import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";

export default function Button({ title, onPress, icon }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row bg-[#006bb3] rounded-2xl py-4 justify-center items-center shadow-lg"
      activeOpacity={0.9}
    >
      {icon && <Ionicons name={icon} size={22} color="white" className="mr-2" />}
      <Text className="text-white font-semibold text-base">{title}</Text>
    </TouchableOpacity>
  );
}
