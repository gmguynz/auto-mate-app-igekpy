
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle, View, Text } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Mapping of SF Symbol names to Material Icons for fallback
const symbolToMaterialIconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  "house.fill": "home",
  "person.2.fill": "people",
  "shield.fill": "shield",
  "person.circle.fill": "account-circle",
  "lock.shield.fill": "security",
  "envelope.fill": "email",
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "info.circle.fill": "info",
  "bell.fill": "notifications",
  "magnifyingglass": "search",
  "xmark.circle.fill": "cancel",
  "person.crop.circle.badge.plus": "person-add",
  "person.fill": "person",
  "envelope": "email",
  "phone": "phone",
  "iphone": "smartphone",
  "trash": "delete",
  "plus": "add",
};

export function IconSymbol({
  ios_icon_name,
  android_material_icon_name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  ios_icon_name: SymbolViewProps["name"];
  android_material_icon_name: any;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Try to use SymbolView, but provide fallback
  try {
    return (
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name={ios_icon_name}
        style={[
          {
            width: size,
            height: size,
          },
          style,
        ]}
        fallback={
          <MaterialIcons
            name={android_material_icon_name || symbolToMaterialIconMap[ios_icon_name] || "help"}
            size={size}
            color={color}
          />
        }
      />
    );
  } catch (error) {
    // If SymbolView fails (e.g., in Expo Go), use Material Icons
    console.log(`SymbolView failed for ${ios_icon_name}, using fallback`);
    return (
      <MaterialIcons
        name={android_material_icon_name || symbolToMaterialIconMap[ios_icon_name] || "help"}
        size={size}
        color={color}
        style={style as any}
      />
    );
  }
}
