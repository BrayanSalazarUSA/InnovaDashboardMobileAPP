import React, { useState } from "react";
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  Text,
  Pressable,
} from "react-native";

export default function EvidencesGallery({ report, BUCKET_URL }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <View className="mt-3">
      {/* Miniaturas */}
      <View className="flex-row flex-wrap justify-between">
        {report.evidences?.map((e: any, i: number) => (
          <TouchableOpacity
            key={e.id || i}
            activeOpacity={0.9}
            className="mb-3"
            style={{ width: "48%" }}
            onPress={() => setSelectedImage(BUCKET_URL + e.path)}
          >
            <Image
              source={{ uri: BUCKET_URL + e.path }}
              className="w-full aspect-square rounded-xl border border-[#EDE8D3]"
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
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
              source={{ uri: selectedImage }}
              className="w-[90%] h-[70%] rounded-2xl border border-[#C9A13B]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
