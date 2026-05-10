import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import * as Updates from "expo-updates";

// ── Configuración ──────────────────────────────────────────────
// Cambiá esta URL por donde subas el APK nuevo cada vez
const APK_DOWNLOAD_URL = "https://t.me/cinewickvip";
const CURRENT_VERSION  = "1.0.0";

export function useAppUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    // 1️⃣ OTA: actualizaciones silenciosas de JS
    try {
      if (!__DEV__) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Reinicia la app con la nueva versión silenciosamente
          await Updates.reloadAsync();
          return;
        }
      }
    } catch (e) {
      // Si falla OTA, seguimos con el popup
    }

    // 2️⃣ Popup: aviso de nueva versión de APK
    try {
      const res = await fetch(
  "https://raw.githubusercontent.com/jcasastech88-tech/cinewick-app/main/version.json",
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.version && data.version !== CURRENT_VERSION) {
        Alert.alert(
          "🎬 Nueva versión disponible",
          `CineWick ${data.version} ya está disponible.\n\n${data.changelog || "Mejoras y correcciones."}`,
          [
            {
              text: "Actualizar ahora",
              onPress: () => Linking.openURL(data.downloadUrl || APK_DOWNLOAD_URL),
            },
            { text: "Más tarde", style: "cancel" },
          ]
        );
        setUpdateAvailable(true);
      }
    } catch {
      // Si no hay internet o el archivo no existe, ignorar
    }
  }

  return { updateAvailable };
}
