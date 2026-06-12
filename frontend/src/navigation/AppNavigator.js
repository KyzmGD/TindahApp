import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ExploreScreen from "../screens/ExploreScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#ff4458" size="large" />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ff4458",
        tabBarInactiveTintColor: "#8c8f9f",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: "Explore",
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>T</Text>,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={ChatListScreen}
        options={{
          tabBarLabel: "Matches",
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>M</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>P</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafbff",
  },
  tabBar: {
    height: 68,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#ececf2",
  },
  tabLabel: {
    fontWeight: "700",
  },
  tabIcon: {
    fontSize: 16,
    fontWeight: "900",
  },
});
