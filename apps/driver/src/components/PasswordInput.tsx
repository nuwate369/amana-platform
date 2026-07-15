import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * حقل كلمة مرور بأيقونة إظهار/إخفاء — يُعاد استخدامه في تسجيل الدخول وإنشاء الحساب.
 * يعمل داخل Controller (react-hook-form): مرّر value/onChangeText/onBlur.
 */
export function PasswordInput({
  value,
  onChangeText,
  onBlur,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <View className="h-14 flex-row items-center rounded-xl border border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800">
      <TextInput
        className="h-full flex-1 font-plex text-base text-neutral-900 dark:text-neutral-50"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onBlur={onBlur}
        onChangeText={onChangeText}
      />
      <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} className="pl-2">
        <MaterialIcons
          name={show ? 'visibility-off' : 'visibility'}
          size={22}
          color={driverNavy[400]}
        />
      </Pressable>
    </View>
  );
}
