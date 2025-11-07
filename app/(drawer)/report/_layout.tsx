// app/(drawer)/report/_layout.tsx
import { Stack } from "expo-router";

export default function ReportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // usamos nuestro Header personalizado
      }}
    >
      {/* Esto hace que report/[id].tsx sea una pantalla de Stack dentro del Drawer */}
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
