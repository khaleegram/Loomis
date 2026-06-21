import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <View className={cn(MOBILE_THEME.dataPanel, padded && 'p-4', className)} {...props}>
      {children}
    </View>
  );
}
