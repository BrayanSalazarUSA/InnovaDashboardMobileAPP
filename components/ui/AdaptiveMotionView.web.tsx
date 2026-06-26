import React from "react";
import { View, type ViewProps } from "react-native";

type Props = React.PropsWithChildren<
  ViewProps & {
    from?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    transition?: Record<string, unknown>;
  }
>;

export default function AdaptiveMotionView({
  children,
  from: _from,
  animate: _animate,
  transition: _transition,
  ...props
}: Props) {
  return <View {...props}>{children}</View>;
}
