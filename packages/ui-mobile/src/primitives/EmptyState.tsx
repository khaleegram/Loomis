import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center px-6 py-12', className)}>
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
        <Text className="text-2xl">📋</Text>
      </View>
      <Text className="mb-2 text-center text-base font-bold text-neutral-900">
        {title}
      </Text>
      {description ? (
        <Text className="mb-6 text-center text-sm text-neutral-500">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction} className="w-full max-w-xs">
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
