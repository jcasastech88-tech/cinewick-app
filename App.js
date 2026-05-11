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
    card:       colors.bg,
    text:       colors.white,
    border:     colors.border,
  },
};

function AppNavigator() {
  useAppUpdates();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => (
            <View style={s.logoWrap}>
              <Text style={s.logoIcon}>🎬</Text>
              <Text style={s.logoText}>
                CINE<Text style={s.logoAccent}>WICK</Text>
              </Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={s.telegramBtn}
              onPress={() => Linking.openURL("https://t.me/cinewickvip")}
            >
              <Text style={s.telegramText}>✈️ Telegram</Text>
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: colors.bg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.white,
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

const s = StyleSheet.create({
  logoWrap:    { flexDirection: "row", alignItems: "center", gap: 6 },
  logoIcon:    { fontSize: 20 },
  logoText:    { fontSize: 20, fontWeight: "900", letterSpacing: 2, color: colors.white },
  logoAccent:  { color: colors.primary },
  telegramBtn: { backgroundColor: colors.telegram, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 12 },
  telegramText:{ color: "#fff", fontSize: 12, fontWeight: "700" },
});
