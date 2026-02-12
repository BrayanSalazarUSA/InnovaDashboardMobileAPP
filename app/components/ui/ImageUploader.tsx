import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  label?: string;
  onRemoveRemoteImage?: (url: string) => Promise<void>;
  maxImages?: number;
};

const screenWidth = Dimensions.get("window").width;

export default function ImageUploader({
  images,
  setImages,
  label,
  onRemoveRemoteImage,
  maxImages = 10,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(Date.now()); // 🔁 fuerza actualización visual

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso requerido",
          "Debes permitir el acceso a tus fotos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - images.length,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const uris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris]);
        setRefreshKey(Date.now()); // 🔁 fuerza recarga
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const removeImage = async (index: number) => {
    const imgToRemove = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    setRefreshKey(Date.now()); // 🔁 recarga tras eliminar

    if (onRemoveRemoteImage && imgToRemove.startsWith("http")) {
      try {
        await onRemoveRemoteImage(imgToRemove);
      } catch (error) {
        console.error("Error al eliminar imagen remota:", error);
      }
    }
  };

  return (
    <View className="mb-6">
      {label && (
        <Text className="font-semibold text-[#A67C00] mb-3 text-base">
          {label}
        </Text>
      )}

      {/* Botón principal */}
      <TouchableOpacity
        onPress={pickImage}
        activeOpacity={0.85}
        className={`border-2 border-dashed border-[#C9A13B] rounded-2xl bg-[#fffbe6] p-6 flex flex-col items-center justify-center ${
          images.length >= maxImages ? "opacity-60" : ""
        }`}
        disabled={images.length >= maxImages}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}
      >
        <MaterialCommunityIcons
          name="camera-plus-outline"
          size={32}
          color="#A67C00"
        />
        <Text className="text-[#A67C00] font-semibold mt-2 text-base">
          {images.length >= maxImages
            ? "Límite alcanzado"
            : "Seleccionar Imágenes"}
        </Text>
        <Text className="text-gray-500 text-sm mt-1">
          {images.length > 0
            ? `${images.length} ${
                images.length === 1
                  ? "imagen seleccionada"
                  : "imágenes seleccionadas"
              }`
            : `Puedes subir hasta ${maxImages} imágenes`}
        </Text>
      </TouchableOpacity>

      {/* Galería de imágenes */}
      {images.length > 0 && (
        <View className="flex flex-wrap flex-row justify-between mt-5">
          {images.map((uri, i) => {
            const cacheBypassUri = uri.startsWith("http")
              ? `${uri}?v=${refreshKey}`
              : uri;

            return (
              <View
                key={`${cacheBypassUri}-${i}`}
                style={{
                  width: (screenWidth - 60) / 2,
                  aspectRatio: 1,
                  borderRadius: 16,
                  marginBottom: 12,
                  position: "relative",
                  backgroundColor: "#f8f8f8",
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                }}
              >
                <Image
                  source={{ uri: cacheBypassUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />

                {/* Botón eliminar */}
                <TouchableOpacity
                  onPress={() => removeImage(i)}
                  activeOpacity={0.9}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 20,
                    padding: 4,
                  }}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
