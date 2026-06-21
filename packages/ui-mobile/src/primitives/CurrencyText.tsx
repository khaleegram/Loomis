import { formatKobo } from '@loomis/core';
import { Text, type TextProps } from 'react-native';
import { cn } from '../utils/cn.js';

export interface CurrencyTextProps extends TextProps {
  amountMinor: number;
  className?: string;
}

export function CurrencyText({ amountMinor, className, ...props }: CurrencyTextProps) {
  return (
    <Text className={cn('font-semibold tabular-nums text-neutral-900', className)} {...props}>
      {formatKobo(amountMinor)}
    </Text>
  );
}
