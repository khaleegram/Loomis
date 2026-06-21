import { View } from 'react-native';
import { cn } from '../utils/cn.js';

export function Separator({ className }: { className?: string }) {
  return <View className={cn('h-px bg-neutral-200', className)} />;
}
