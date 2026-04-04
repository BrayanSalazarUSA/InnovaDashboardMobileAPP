import React from "react";
import { Text, View } from "react-native";

import { getAppVersionLabel } from "../_lib/diagnostics";

export default function AppVersionFooter({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <View
      className={compact ? "items-center py-2" : "items-center py-5"}
      accessible
      accessibilityLabel={`Version de la app ${getAppVersionLabel()}`}
    >
      <Text className="text-[11px] uppercase tracking-[1px] text-[#9A8A63] font-semibold">
        Version instalada
      </Text>
      <Text className="text-sm text-[#5E5645] mt-1 font-medium">
        {getAppVersionLabel()}
      </Text>
    </View>
  );
}
