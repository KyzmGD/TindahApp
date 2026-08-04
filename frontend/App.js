import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { configurePushNotificationHandler } from "./src/services/pushNotifications";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";

configurePushNotificationHandler();

function AppContent() {
  const { mode, theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.screen }}>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
