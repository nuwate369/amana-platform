import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * مجموعة التبويبات السفلية للراكبة — تبويبان ظاهران (الرئيسية، رحلاتي).
 * «الإشعارات» و«حسابي» مسجَّلتان كمسارات لكنهما مخفيّتان من الشريط السفلي
 * (href: null) لأنهما تُفتحان من الشريط العلوي في الرئيسية — تفاديًا للتكرار.
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
      {/* مخفيّة من الشريط السفلي (href: null) — تُفتح من الشريط العلوي في الرئيسية */}
      <Tabs.Screen name="notifications" options={{ href: null, title: 'الإشعارات' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'حسابي' }} />
    </Tabs>
  );
}
