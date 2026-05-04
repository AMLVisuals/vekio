import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Platform } from 'react-native';
import TabIcon, { type TabIconName } from '../../components/TabIcon';
import { palette } from '../../theme/tokens';

export default function TabsLayout() {
  const theme = useTheme();

  const screen = (name: string, title: string, icon: TabIconName) => (
    <Tabs.Screen
      name={name}
      options={{
        title,
        tabBarIcon: ({ color, focused }) => <TabIcon name={icon} color={color} focused={focused} />,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.primary,
        tabBarInactiveTintColor: palette.neutral500,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor:  palette.neutral200,
          borderTopWidth:  1,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      {screen('index',      'Dashboard', 'home')}
      {screen('journal',    'Journal',   'journal')}
      {screen('historique', 'Stats',     'stats')}
      {screen('menus',      'Menus',     'menus')}
      {screen('profil',     'Profil',    'profil')}
    </Tabs>
  );
}
