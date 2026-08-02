import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

const palette = {
  dark: {
    mode: "dark",
    colors: {
      screen: "#050506",
      surface: "#121016",
      elevated: "#1c1720",
      elevatedAlt: "#251d2d",
      border: "#2c2334",
      borderStrong: "#403449",
      text: "#ffffff",
      muted: "#cbbdd2",
      dim: "#8f8398",
      primary: "#ff4f7b",
      primaryStrong: "#ff2f6d",
      primarySoft: "rgba(255,79,123,0.14)",
      accent: "#20c7ff",
      accentSoft: "rgba(32,199,255,0.12)",
      success: "#23d49b",
      warning: "#ffd166",
      danger: "#ff5d72",
      skeletonBase: "#201926",
      skeletonHighlight: "#33283d",
      overlay: "rgba(5,5,6,0.72)",
      shadow: "#20c7ff",
    },
  },
  light: {
    mode: "light",
    colors: {
      screen: "#f7f5fa",
      surface: "#ffffff",
      elevated: "#f0ebf5",
      elevatedAlt: "#e9e2ef",
      border: "#ded6e7",
      borderStrong: "#cfc3db",
      text: "#121018",
      muted: "#61556b",
      dim: "#8b7f94",
      primary: "#ff3f72",
      primaryStrong: "#f02f66",
      primarySoft: "rgba(255,63,114,0.14)",
      accent: "#008cd6",
      accentSoft: "rgba(0,140,214,0.12)",
      success: "#0a936b",
      warning: "#b57900",
      danger: "#d9304f",
      skeletonBase: "#e5dfea",
      skeletonHighlight: "#f8f5fb",
      overlay: "rgba(18,16,24,0.34)",
      shadow: "#9d75ff",
    },
  },
};

const ThemeContext = createContext({
  theme: palette.dark,
  mode: "dark",
});

export function ThemeProvider({ children }) {
  const colorScheme = useColorScheme();
  const mode = colorScheme === "light" ? "light" : "dark";
  const value = useMemo(() => ({ theme: palette[mode], mode }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
