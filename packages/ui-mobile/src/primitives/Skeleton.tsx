import { View } from 'react-native';
import { cn } from '../utils/cn.js';

export function Skeleton({ className }: { className?: string }) {
  return (
    <View
      className={cn('animate-pulse rounded-lg bg-neutral-200', className)}
    />
  );
}
