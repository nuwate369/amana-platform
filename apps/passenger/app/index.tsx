import { Redirect } from 'expo-router';

/** يعيد التوجيه إلى الرئيسية داخل التبويبات؛ حارس المسارات يتكفّل بغير المسجّلات. */
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
