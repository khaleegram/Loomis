import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: MOBILE_THEME.ctaPrimary,
  secondary: MOBILE_THEME.ctaSecondary,
  ghost: 'bg-transparent',
  danger: 'bg-red-600 text-white active:bg-red-700',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[40px] px-4 py-2 rounded-lg',
  md: 'min-h-[48px] px-5 py-3 rounded-xl',
  lg: 'min-h-[52px] px-6 py-3.5 rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#171717' : '#ffffff'}
          size="small"
        />
      ) : typeof children === 'string' ? (
        <Text
          className={cn(
            'text-sm font-semibold',
            variant === 'primary' && 'text-neutral-900',
            variant === 'secondary' && 'text-neutral-800',
            variant === 'ghost' && 'text-brand-600',
            variant === 'danger' && 'text-white',
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
