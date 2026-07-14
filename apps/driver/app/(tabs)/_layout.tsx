import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * تبويبات السائقة السفلية — في المرحلة أ تبويب «الرئيسية» فقط
 * (تُضاف بقية التبويبات: الأرباح/الرحلات/الحساب في المرحلة ب).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: driverNavy[600],
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontFamily: 'IBMPlexSansArabic_500Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
