import { Stack } from 'expo-router';

export default function AssetsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Assets',
          headerLargeTitle: true,
          headerTransparent: true,
        }} 
      />
    </Stack>
  );
}
