import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ExploreScreen from "../screens/ExploreScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_META = {
  Explore: { label: "Explore", icon: "T" },
  Matches: { label: "Matches", icon: "M" },
  Profile: { label: "Profile", icon: "P" },
};

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#ff4f7b" size="large" />
    </View>
  );
}

function TindahTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const meta = TAB_META[route.name] || {
          label: options.tabBarLabel || options.title || route.name,
          icon: route.name.charAt(0),
        };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ hovered, pressed }) => [
              styles.tabItem,
              isFocused && styles.tabItemActive,
              hovered && styles.tabItemHover,
              pressed && styles.tabItemPressed,
            ]}
          >
            {({ hovered }) => (
              <>
                <Text
                  style={[
                    styles.tabIcon,
                    isFocused && styles.tabIconActive,
                    hovered && styles.tabIconHover,
                  ]}
                >
                  {meta.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelActive,
                    hovered && styles.tabLabelHover,
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TindahTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Matches" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
            <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
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
    backgroundColor: "#050506",
  },
  tabBar: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#2c2334",
    backgroundColor: "#121016",
    shadowColor: "#20c7ff",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: "rgba(255,79,123,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,79,123,0.28)",
  },
  tabItemHover: {
    backgroundColor: "rgba(32,199,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,199,255,0.34)",
    transform: [{ translateY: -2 }],
  },
  tabItemPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  tabLabel: {
    color: "#a79aaa",
    fontSize: 12,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#ff4f7b",
  },
  tabLabelHover: {
    color: "#ffffff",
  },
  tabIcon: {
    color: "#a79aaa",
    fontSize: 16,
    fontWeight: "900",
  },
  tabIconActive: {
    color: "#ff4f7b",
  },
  tabIconHover: {
    color: "#ffffff",
    transform: [{ scale: 1.08 }],
  },
});
