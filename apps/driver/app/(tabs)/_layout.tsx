import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * تبويبات السائقة السفلية — «الرئيسية» و«حسابي».
 * (تُضاف بقية التبويبات: الأرباح/الرحلات في المرحلة ب من القيادة.)
 */
export default function TabsLayout() {
  const { t } = useTranslation();
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
          title: t('nav.home', 'الرئيسية'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('nav.account', 'حسابي'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
