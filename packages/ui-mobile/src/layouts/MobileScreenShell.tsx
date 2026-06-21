import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';
import { SectionLabel } from '../primitives/Label.js';
import { SafeScreen } from './SafeScreen.js';

export interface MobileScreenShellProps {
  children: ReactNode;
  offlineBanner?: ReactNode;
  className?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function MobileScreenShell({
  children,
  offlineBanner,
  className,
  scroll = true,
  refreshing,
  onRefresh,
}: MobileScreenShellProps) {
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="pb-8"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor="#8a7048" />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1">{children}</View>
  );

  return (
    <SafeScreen {...(className ? { className } : {})}>
      {offlineBanner}
      {body}
    </SafeScreen>
  );
}

export interface CompactHeroProps {
  consoleLabel: string;
  userName?: string;
  description?: string;
}

export function CompactHero({ consoleLabel, userName, description }: CompactHeroProps) {
  return (
    <LinearGradient
      colors={['#faf7f2', '#ffffff', '#f5efe6']}
      className="px-5 pb-6 pt-1"
    >
      <SectionLabel>{consoleLabel}</SectionLabel>
      <Text className={cn(MOBILE_THEME.pageTitle, 'mt-1')}>
        {userName ? `Hello, ${userName}` : 'Welcome'}
      </Text>
      {description ? (
        <Text className="mt-1 text-sm text-neutral-500">{description}</Text>
      ) : null}
    </LinearGradient>
  );
}

export interface StatChip {
  id: string;
  label: string;
  value: string;
}

export function StatChipRow({ chips }: { chips: StatChip[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-5 py-3"
      className="flex-grow-0"
    >
      {chips.map((chip) => (
        <View
          key={chip.id}
          className={cn(MOBILE_THEME.dataPanel, 'min-w-[120px] px-4 py-3')}
        >
          <Text className={MOBILE_THEME.sectionLabel}>{chip.label}</Text>
          <Text className="mt-1 text-lg font-extrabold text-neutral-900">
            {chip.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export interface ActionGridItem {
  id: string;
  label: string;
  onPress?: () => void;
}

export function ActionGrid({ items }: { items: ActionGridItem[] }) {
  if (items.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-3 px-5">
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          disabled={!item.onPress}
          onPress={item.onPress}
          className={cn(
            'min-h-[88px] min-w-[46%] flex-1 p-4 active:bg-brand-50',
            MOBILE_THEME.dataPanel,
          )}
        >
          <Text className="text-sm font-bold text-neutral-900">{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
