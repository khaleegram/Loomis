import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function ParentLayout() {
  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8fafc' } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}
