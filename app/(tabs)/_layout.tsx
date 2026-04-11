import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Platform, Text } from 'react-native';

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon label="◉" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => <TabIcon label="📋" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => <TabIcon label="📊" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menus"
        options={{
          title: 'Menus',
          tabBarIcon: ({ color, focused }) => <TabIcon label="🍽" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => <TabIcon label="👤" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
