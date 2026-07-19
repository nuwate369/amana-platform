import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { driverNavy } from '@amana/shared-ui/tokens';
import { PresenceProvider } from '@/lib/presence';
import { DriverRidesProvider } from '@/lib/driver-rides';

/**
 * تبويبات السائقة السفلية — «الرئيسية» (خريطة القيادة) و«رحلاتي».
 * «حسابي» مسجَّلة كمسار لكنها مخفيّة من الشريط السفلي (href: null) — تُفتح من أيقونة
 * الحساب في الشريط العلويّ للرئيسية (كتطبيق الراكب). يلفّها PresenceProvider للحضور.
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
          name="ride-history"
          options={{
            title: t('nav.myRides', 'رحلاتي'),
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="history" size={size} color={color} />
            ),
          }}
        />
        {/* مخفيّة من الشريط السفلي — تُفتح من أيقونة الحساب في الشريط العلويّ */}
        <Tabs.Screen name="account" options={{ href: null, title: t('nav.account', 'حسابي') }} />
      </Tabs>
      </DriverRidesProvider>
    </PresenceProvider>
  );
}
