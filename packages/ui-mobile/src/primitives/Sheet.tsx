import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ visible, onClose, title, children, className }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className={cn('rounded-t-3xl bg-white px-5 pt-4', className)}
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-neutral-300" />
        {title ? (
          <Text className={cn(MOBILE_THEME.pageTitle, 'mb-4 text-xl')}>{title}</Text>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}
