import React from "react";
import { StatusBar, View, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import DetailScreen from "./src/screens/DetailScreen";
import { colors } from "./src/theme";
import { useAppUpdates } from "./src/useUpdates";

const Stack = createStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: "#f0f0f5",
    border: "#ffffff15",
  },
};

function AppNavigator() {
  // Activa OTA + popup de actualización automáticamente
  useAppUpdates();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Text style={styles.logoIcon}>🎬</Text>
              <Text style={styles.logoText}>
                CINE<Text style={styles.logoAccent}>WICK</Text>
              </Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.telegramBtn}
              onPress={() => Linking.openURL("https://t.me/cinewickvip")}
            >
              <Text style={styles.telegramText}>✈️ Telegram</Text>
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: colors.bg, elevation: 0, shadowOpacity: 0 },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={NavTheme}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoIcon: { fontSize: 20 },
  logoText: { fontSize: 20, fontWeight: "900", letterSpacing: 2, color: "#fff" },
  logoAccent: { color: colors.red },
  telegramBtn: {
    backgroundColor: "#229ED9",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginRight: 12,
  },
  telegramText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
