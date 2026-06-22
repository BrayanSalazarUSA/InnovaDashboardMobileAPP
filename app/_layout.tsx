import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import logo from "../assets/images/logo.png";
import { initializeDiagnostics } from "../utils/diagnostics";
import ProtocolNotificationCoordinator from "./_components/ProtocolNotificationCoordinator";
import PushNotificationCoordinator from "./_components/PushNotificationCoordinator";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    initializeDiagnostics();

    // 🔸 Animación de entrada del logo y texto
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Simula tiempo de carga (puedes ajustarlo)
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {Platform.OS === "web" ? (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(drawer)" />
            </Stack>

            {isLoading ? (
              <View style={styles.loadingOverlay} pointerEvents="auto">
                <Animated.View
                  style={[
                    styles.logoContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Image
                    source={logo}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.title}>Innova Dashboard App</Text>
                  <Text style={styles.slogan}>Reinventando la Seguridad</Text>
                </Animated.View>

                <ActivityIndicator
                  size="large"
                  color="#C9A13B"
                  style={{ marginTop: 40 }}
                />
              </View>
            ) : null}
          </>
        ) : (
          <ProtocolNotificationCoordinator>
            <PushNotificationCoordinator />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(drawer)" />
            </Stack>

            {isLoading ? (
              <View style={styles.loadingOverlay} pointerEvents="auto">
                <Animated.View
                  style={[
                    styles.logoContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  <Image
                    source={logo}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.title}>Innova Dashboard App</Text>
                  <Text style={styles.slogan}>Reinventando la Seguridad</Text>
                </Animated.View>

                <ActivityIndicator
                  size="large"
                  color="#C9A13B"
                  style={{ marginTop: 40 }}
                />
              </View>
            ) : null}
          </ProtocolNotificationCoordinator>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF7",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFDF7",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E1E1E",
    letterSpacing: 1,
  },
  slogan: {
    fontSize: 14,
    color: "#C9A13B",
    marginTop: 4,
    fontStyle: "italic",
  },
});
