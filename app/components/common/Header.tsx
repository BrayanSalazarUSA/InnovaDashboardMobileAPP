import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
 
type Props = {
  title: string;
  onBack?: () => void;
};

export default function Header({ title, onBack, icon="menu-outline" }: Props) {
 ;

  return (
    <View
      style={{ padding: 6}}
      className="bg-[#F9F7F1] border-b border-[#E4D8B4] shadow-sm px-4  flex-row items-center justify-between"
    >
      {/* Botón atrás */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          className="p-2 rounded-full active:opacity-80"
        >
          <Ionicons name="chevron-back" size={24} color="#A67C00" />
        </TouchableOpacity>
      ) : (
        <View className="w-8" /> // Para mantener el centrado del titulo
      )}

      {/* Título */}
      <Text className="text-[#070c14] font-semibold text-lg flex-1 text-center">
        {title}
      </Text>

      {/* Mini logo para balancear */}
   <Ionicons name={icon} size={22} color="#A67C00" />

    </View>
  );
}
