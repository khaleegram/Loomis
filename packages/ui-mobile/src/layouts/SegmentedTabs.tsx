import { Pressable, Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface SegmentedTabOption<T extends string> {
  id: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <View className={cn('mx-5 mt-4 flex-row gap-2', className)}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            className={cn(
              'min-h-[44px] flex-1 items-center justify-center rounded-xl',
              active ? MOBILE_THEME.pillActive : MOBILE_THEME.pillInactive,
            )}
          >
            <Text
              className={cn(
                'text-xs font-semibold capitalize',
                active ? 'text-white' : 'text-neutral-700',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
