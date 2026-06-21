import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface ChildOption {
  id: string;
  label: string;
  subtitle?: string;
}

export interface ChildSwitcherProps {
  children: ChildOption[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ChildSwitcher({ children, activeId, onSelect }: ChildSwitcherProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, maxHeight: 56 }}
      contentContainerClassName="items-center gap-2 px-5 py-3"
      className={cn(MOBILE_THEME.toolbarSurface)}
    >
      {children.map((child) => {
        const active = child.id === activeId;
        return (
          <Pressable
            key={child.id}
            onPress={() => onSelect(child.id)}
            className={cn(
              'self-center rounded-full px-4 py-2',
              active ? MOBILE_THEME.pillActive : MOBILE_THEME.pillInactive,
            )}
            style={{ maxHeight: 44 }}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                active ? 'text-white' : 'text-neutral-700',
              )}
            >
              {child.label}
            </Text>
            {child.subtitle ? (
              <Text className="text-[10px] text-neutral-500">{child.subtitle}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export interface ChildContextHubProps {
  children: ChildOption[];
  activeChildId: string | null;
  onSelectChild: (id: string) => void;
  toolbar?: ReactNode;
  body: ReactNode;
}

export function ChildContextHub({
  children,
  activeChildId,
  onSelectChild,
  toolbar,
  body,
}: ChildContextHubProps) {
  return (
    <View className="flex-1 bg-neutral-50">
      <ChildSwitcher children={children} activeId={activeChildId} onSelect={onSelectChild} />
      {toolbar}
      <View className="flex-1">{body}</View>
    </View>
  );
}

export function ChildContextTitle({ title }: { title: string }) {
  return <Text className={cn(MOBILE_THEME.pageTitle, 'px-5 py-4')}>{title}</Text>;
}
