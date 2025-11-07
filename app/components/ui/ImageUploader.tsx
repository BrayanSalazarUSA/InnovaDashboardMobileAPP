import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  label?: string;
};

export default function ImageUploader({ images, setImages, label }: Props) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View className=" mb-6">
      {label ? (
        <Text className="font-semibold text-[#A67C00] mb-2">{label}</Text>
      ) : null}

      {/* Botón de carga */}
      <TouchableOpacity
        onPress={pickImage}
        activeOpacity={0.85}
        className="border-2 border-dashed border-[#C9A13B] rounded-xl bg-[#fffbe6] p-5 flex flex-col items-center justify-center"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
        }}
      >
        <MaterialCommunityIcons
          name="camera-plus-outline"
          size={28}
          color="#A67C00"
        />
        <Text className="text-[#A67C00] font-semibold mt-2">
          Seleccionar Imágenes
        </Text>
        <Text className="text-gray-500 text-sm mt-1">
          {images.length > 0
            ? `${images.length} ${images.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}`
            : "Puedes subir hasta 5 imágenes"}
        </Text>
      </TouchableOpacity>

      {/* Galería de vistas previas */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-3 mt-4"
        >
          {images.map((uri, i) => (
            <View key={i} className="relative">
              <Image
                source={{ uri }}
                className="w-24 h-24 rounded-xl"
                resizeMode="cover"
              />

              {/* Botón de eliminar */}
              <TouchableOpacity
                onPress={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow"
              >
                <MaterialCommunityIcons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
