import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '../utils/cn.js';

export interface InputProps extends TextInputProps {
  className?: string;
  error?: boolean;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      className={cn(
        'min-h-[48px] rounded-xl border border-neutral-200 bg-white px-4 text-base text-neutral-900',
        error && 'border-red-500',
        className,
      )}
      {...props}
    />
  );
}
