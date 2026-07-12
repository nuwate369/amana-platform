import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * مجموعة التبويبات السفلية للراكبة — أربعة تبويبات رئيسية.
 * اللون النشط أرجواني العلامة، غير النشط رمادي محايد، والخط IBM Plex Sans Arabic.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: passengerPurple[600],
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexSansArabic_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ride-history"
        options={{
          title: 'رحلاتي',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'الإشعارات',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
