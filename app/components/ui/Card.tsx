import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  title: string;
  description?: string;
  onPress?: () => void;
  children?: React.ReactNode;
};

export default function Card({ title, description, onPress, children }: Props) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      className="bg-white border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm"
    >
      <Text className="text-lg font-semibold text-[#1C1C1C]">{title}</Text>
      {description && <Text className="text-gray-600 mt-1">{description}</Text>}
      {children}
    </Container>
  );
}
