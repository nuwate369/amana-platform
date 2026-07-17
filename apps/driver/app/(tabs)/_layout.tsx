import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { driverNavy } from '@amana/shared-ui/tokens';
import { PresenceProvider } from '@/lib/presence';
import { DriverRidesProvider } from '@/lib/driver-rides';

/**
 * تبويبات السائقة السفلية — «الرئيسية» (خريطة القيادة) و«حسابي».
 * يلفّها PresenceProvider ليتتبّع حضور السائقة (فتح/اتصال/موقع) طوال الجلسة.
 * (تُضاف «الأرباح/الرحلات» في مرحلة لاحقة من القيادة.)
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <PresenceProvider>
      <DriverRidesProvider>
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
      </DriverRidesProvider>
    </PresenceProvider>
  );
}
