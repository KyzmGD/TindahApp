import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
