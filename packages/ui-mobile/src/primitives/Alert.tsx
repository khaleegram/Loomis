import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';

export interface AlertProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<AlertProps['tone']>, string> = {
  info: 'border-brand-200 bg-brand-50',
  success: 'border-accent-green-200 bg-accent-green-50',
  warning: 'border-gold-200 bg-gold-50',
  danger: 'border-red-200 bg-red-50',
};

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <View className={cn('rounded-xl border p-4', toneClasses[tone], className)}>
      {title ? <Text className="mb-1 text-sm font-bold text-neutral-900">{title}</Text> : null}
      {typeof children === 'string' ? (
        <Text className="text-sm text-neutral-600">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
