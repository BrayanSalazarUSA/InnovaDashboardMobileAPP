import { ReportImage } from "@/app/(drawer)/new";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect } from "react";
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
     🔍 LOGS DE RENDER
  ========================== */
  useEffect(() => {
    console.log("🧩 [ImageUploader] render");
    console.log("🧩 Total imágenes:", images.length);

    images.forEach((img, i) => {
      console.log(
        `🧩 Image[${i}]`,
        img.isRemote ? "[REMOTE]" : "[LOCAL]",
        img.uri,
      );
    });
  }, [images]);

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
      const newImages: ReportImage[] = result.assets.map((a) => {
        console.log("📸 Imagen local seleccionada:", a.uri);
        return {
          uri: a.uri,
          isRemote: false,
        };
      });

      setImages((prev) => [...prev, ...newImages]);
    }
  };
  /* =========================
     ❌ REMOVE IMAGE
  ========================== */
  const removeImage = async (index: number) => {
    const img = images[index];

    console.log("❌ [ImageUploader] removeImage");
    console.log("❌ Index:", index);
    console.log("❌ Imagen:", img);

    // Backend si es remota
    if (img.isRemote && onRemoveRemoteImage) {
      console.log("❌ Eliminando imagen remota en backend:", img.uri);
      try {
        await onRemoveRemoteImage(img);
        console.log("✅ Imagen eliminada en backend");
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

            console.log(
              "🖼️ [ImageUploader] Render image",
              i,
              img.isRemote ? "[REMOTE]" : "[LOCAL]",
              displayUri,
            );

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
