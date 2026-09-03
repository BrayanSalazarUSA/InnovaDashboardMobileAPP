import { ReportImage } from "@/app/(drawer)/new";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  Alert,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  images: ReportImage[];
  setImages: React.Dispatch<React.SetStateAction<ReportImage[]>>;
  label?: string;
  onRemoveRemoteImage?: (image: ReportImage) => Promise<void>;
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
  /* =========================
     📸 PICK IMAGE
  ========================== */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permiso requerido");
      return;
    }

    // ✅ AQUÍ FALTABA ESTO
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // ✅ CORRECTO
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages: ReportImage[] = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || `evidence_${Date.now()}.jpg`,
        file: a.file,
        isRemote: false,
      }));

      setImages((prev) => [...prev, ...newImages]);
    }
  };
  /* =========================
     ❌ REMOVE IMAGE
  ========================== */
  const removeImage = async (index: number) => {
    const img = images[index];

    // Backend si es remota
    if (img.isRemote && onRemoveRemoteImage) {
      try {
        await onRemoveRemoteImage(img);
      } catch (e) {
        console.error("❌ Error eliminando imagen remota", e);
        Alert.alert("Error", "No se pudo eliminar la imagen del servidor");
        return;
      }
    }

    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* =========================
     UI
  ========================== */
  return (
    <View className="mb-6">
      {label && (
        <Text className="font-semibold text-[#A67C00] mb-3 text-base">
          {label}
        </Text>
      )}

      {/* BOTÓN AGREGAR */}
      <TouchableOpacity
        onPress={pickImage}
        disabled={images.length >= maxImages}
        className="border-2 border-dashed border-[#C9A13B] rounded-2xl bg-[#fffbe6] p-6 items-center"
      >
        <MaterialCommunityIcons
          name="camera-plus-outline"
          size={32}
          color="#A67C00"
        />
        <Text className="text-[#A67C00] font-semibold mt-2">
          {images.length >= maxImages
            ? "Límite alcanzado"
            : "Seleccionar imágenes"}
        </Text>
      </TouchableOpacity>

      {/* GALERÍA */}
      {images.length > 0 && (
        <View className="flex flex-wrap flex-row justify-between mt-5">
          {images.map((img, i) => {
            const displayUri = img.isRemote
              ? img.uri + "?v=" + Date.now() // cache-bypass
              : img.uri;

            return (
              <View
                key={`${displayUri}-${i}`}
                style={{
                  width: (screenWidth - 60) / 2,
                  aspectRatio: 1,
                  borderRadius: 16,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: displayUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />

                {/* BOTÓN ELIMINAR */}
                <TouchableOpacity
                  onPress={() => removeImage(i)}
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
