import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '@loomis/ui-mobile';
import { ParentTopChrome } from './parent-top-chrome';
import { parentScrollBottomPadding } from './constants';

interface ParentScreenProps {
  children: ReactNode;
  islandLabel?: string;
  unreadCount?: number;
  scroll?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'children'>;
}

export function ParentScreen({
  children,
  islandLabel,
  unreadCount,
  scroll = true,
  scrollProps,
}: ParentScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = parentScrollBottomPadding(insets.bottom);

  return (
    <SafeScreen edges={[]} className="bg-neutral-50">
      <ParentTopChrome
        {...(islandLabel ? { islandLabel } : {})}
        unreadCount={unreadCount ?? 0}
      />
      {scroll ? (
        <ScrollView
          className="flex-1 bg-neutral-50"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 bg-neutral-50" style={{ paddingBottom: bottomPad }}>
          {children}
        </View>
      )}
    </SafeScreen>
  );
}
