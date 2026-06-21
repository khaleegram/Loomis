import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';

export interface BadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  className?: string;
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-accent-green-50 text-accent-green-600',
  warning: 'bg-gold-50 text-gold-700',
  danger: 'bg-red-50 text-red-600',
  brand: 'bg-brand-100 text-brand-800',
};

export function Badge({ label, tone = 'default', className }: BadgeProps) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', toneClasses[tone], className)}>
      <Text className="text-[11px] font-semibold">{label}</Text>
    </View>
  );
}
