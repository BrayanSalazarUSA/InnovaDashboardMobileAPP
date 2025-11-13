import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

export default function EvidencesGallery({ report, BUCKET_URL }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(Date.now()); // 🔑 Fuerza recarga de imágenes

  useEffect(() => {
    console.log("🟡 Report cambió, actualizando evidencias...");
    console.log(report);

    if (report?.evidences?.length) {
      setEvidences(report.evidences);
      setRefreshKey(Date.now()); // 🔁 Refresca imágenes cada vez que cambia el reporte
    } else {
      setEvidences([]);
    }

    return () => {
      console.log("🧹 Limpiando evidencias al desmontar o cambiar reporte");
      setSelectedImage(null);
      setEvidences([]);
    };
  }, [report?.id, report?.evidences?.length]);

  if (!report) return null;

  return (
    <View className="mt-3">
      {/* Miniaturas */}
      <View className="flex-row flex-wrap justify-between">
        {evidences.length > 0 ? (
          evidences.map((e, i) => {
            const imgUri = `${BUCKET_URL}${e.path}?v=${refreshKey}`;
            return (
              <TouchableOpacity
                key={e.id || i}
                activeOpacity={0.9}
                className="mb-3"
                style={{ width: "48%" }}
                onPress={() => setSelectedImage(imgUri)}
              >
                <Image
                  key={`${imgUri}-${i}`}
                  source={{ uri: imgUri }}
                  className="w-full aspect-square rounded-xl border border-[#EDE8D3]"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          })
        ) : (
          <Text className="text-gray-500 text-center w-full mt-2 italic">
            No hay evidencias registradas.
          </Text>
        )}
      </View>

      {/* Modal para ver imagen en grande */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/95 items-center justify-center">
          <Pressable
            className="absolute top-12 right-6 z-10"
            onPress={() => setSelectedImage(null)}
          >
            <Text className="text-white text-lg font-semibold">✕</Text>
          </Pressable>

          {selectedImage && (
            <Image
              key={`modal-${selectedImage}`}
              source={{ uri: selectedImage }}
              className="w-[90%] h-[70%] rounded-xl"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}