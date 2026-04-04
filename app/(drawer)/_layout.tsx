import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import AppVersionFooter from "../_components/AppVersionFooter";

export default function DrawerLayout() {
  const [dark, setDark] = useState(false);

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        drawerActiveTintColor: "#C9A13B",
        drawerLabelStyle: { fontSize: 15, fontWeight: "500" },
        headerStyle: { backgroundColor: dark ? "#1B1B1B" : "#C9A13B" },
        headerTitle: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 28, height: 28, marginRight: 10 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: dark ? "#fff" : "white",
              }}
            >
              Innova Monitoring App
            </Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setDark(!dark)}
            style={{ marginRight: 16 }}
          >
            <Ionicons
              name={dark ? "moon" : "sunny"}
              size={24}
              color={dark ? "#fff" : "#fff"}
            />
          </TouchableOpacity>
        ),
      }}
      drawerContent={(props) => (
        <View style={{ flex: 1 }}>
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
          </DrawerContentScrollView>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#EFE6CC",
              paddingHorizontal: 12,
              paddingBottom: 18,
            }}
          >
            <AppVersionFooter compact />
          </View>
        </View>
      )}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Reportes Pendientes",
          title: "Reportes Pendientes",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="new"
        options={{
          drawerLabel: "Agregar Reporte",
          title: "Agregar Reporte",
          drawerItemStyle: { display: "none" },
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Oculta detalles */}
      <Drawer.Screen
        name="my-reports"
        options={{
          drawerLabel: "Mis reportes del turno",
          title: "Mis reportes",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="attendance"
        options={{
          drawerLabel: "Control horario",
          title: "Control horario",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="diagnostics"
        options={{
          drawerLabel: "Diagnostico",
          title: "Diagnostico",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bug-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="report"
        options={{
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
