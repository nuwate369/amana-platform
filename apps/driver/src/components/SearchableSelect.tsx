import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { driverNavy } from '@amana/shared-ui/tokens';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * قائمة منسدلة قابلة للبحث — تفتح نافذة سفلية بحقل بحث وقائمة خيارات.
 * تُعاد استخدامها للشركة الصانعة والموديل وسنة الصنع في شاشة KYC.
 */
export function SearchableSelect({
  label,
  value,
  placeholder,
  options,
  onSelect,
  icon,
  disabled = false,
  searchable = true,
  error,
  disabledHint,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  searchable?: boolean;
  error?: string;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  function choose(option: string) {
    onSelect(option);
    setOpen(false);
    setQuery('');
  }

  return (
    <View className="gap-1.5">
      <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">{label}</Text>

      <Pressable
        onPress={() => {
          if (disabled) return;
          setQuery('');
          setOpen(true);
        }}
        className={`h-14 flex-row items-center gap-2 rounded-xl border bg-white px-4 dark:bg-neutral-800 ${
          error ? 'border-red-400 dark:border-red-600' : 'border-neutral-200 dark:border-neutral-700'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {icon ? <MaterialIcons name={icon} size={20} color={driverNavy[400]} /> : null}
        <Text
          className={`flex-1 font-plex text-base ${
            value ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400 dark:text-neutral-500'
          }`}
          numberOfLines={1}
        >
          {value || (disabled && disabledHint ? disabledHint : placeholder)}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={driverNavy[400]} />
      </Pressable>

      {error ? <Text className="font-plex text-xs text-red-500">{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-[75%] rounded-t-3xl bg-white pb-6 pt-4 dark:bg-neutral-900"
            onPress={(e) => e.stopPropagation()}
          >
            {/* مقبض + عنوان */}
            <View className="mb-3 items-center">
              <View className="mb-3 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">{label}</Text>
            </View>

            {/* حقل البحث */}
            {searchable ? (
              <View className="mx-5 mb-3 h-12 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-700 dark:bg-neutral-800">
                <MaterialIcons name="search" size={20} color={driverNavy[400]} />
                <TextInput
                  className="h-full flex-1 font-plex text-base text-neutral-900 dark:text-neutral-50"
                  placeholder="بحث…"
                  placeholderTextColor="#9ca3af"
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                  textAlign="right"
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <MaterialIcons name="close" size={18} color={driverNavy[400]} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              ListEmptyComponent={
                <Text className="px-5 py-8 text-center font-plex text-sm text-neutral-500 dark:text-neutral-400">
                  لا توجد نتائج
                </Text>
              }
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    onPress={() => choose(item)}
                    className={`flex-row items-center justify-between px-5 py-3.5 active:bg-neutral-100 dark:active:bg-neutral-800 ${
                      selected ? 'bg-brand-50 dark:bg-neutral-800' : ''
                    }`}
                  >
                    <Text
                      className={`font-plex text-base ${
                        selected
                          ? 'font-plex-semibold text-brand-700 dark:text-brand-300'
                          : 'text-neutral-800 dark:text-neutral-100'
                      }`}
                    >
                      {item}
                    </Text>
                    {selected ? <MaterialIcons name="check" size={20} color={driverNavy[600]} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
