import { ScrollView, Text, Pressable } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface TermOption {
  id: string;
  label: string;
}

export interface TermPickerProps {
  terms: TermOption[];
  value: string | null;
  onChange: (termId: string) => void;
  label?: string;
}

export function TermPicker({ terms, value, onChange, label = 'Term' }: TermPickerProps) {
  if (terms.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, maxHeight: 52 }}
      contentContainerClassName="items-center gap-2 px-5 py-2.5"
      className={cn(MOBILE_THEME.toolbarSurface)}
    >
      <Text className={cn(MOBILE_THEME.sectionLabel, 'self-center pr-1')}>{label}</Text>
      {terms.map((term) => {
        const active = term.id === value;
        return (
          <Pressable
            key={term.id}
            accessibilityRole="button"
            onPress={() => onChange(term.id)}
            className={cn(
              'self-center rounded-full px-3.5 py-1.5',
              active ? MOBILE_THEME.pillActive : MOBILE_THEME.pillInactive,
            )}
            style={{ maxHeight: 36 }}
          >
            <Text
              className={cn(
                'text-xs font-semibold',
                active ? 'text-white' : 'text-neutral-700',
              )}
              numberOfLines={1}
            >
              {term.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
