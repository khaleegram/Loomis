import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface SafeScreenProps {
  children: ReactNode;
  edges?: Edge[];
  className?: string;
}

/** Standard screen wrapper — respects notch/status bar on every surface. */
export function SafeScreen({ children, edges = ['top'], className }: SafeScreenProps) {
  return (
    <SafeAreaView edges={edges} className={cn(MOBILE_THEME.screenRoot, className)}>
      {children}
    </SafeAreaView>
  );
}
