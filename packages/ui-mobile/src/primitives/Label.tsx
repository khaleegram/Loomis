import { Text, type TextProps } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export function Label({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={cn('mb-1.5 text-xs font-semibold text-neutral-600', className)}
      {...props}
    />
  );
}

export function SectionLabel({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn(MOBILE_THEME.sectionLabel, className)} {...props} />;
}
