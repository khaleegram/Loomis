import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';
import { SafeScreen } from './SafeScreen.js';

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeScreen edges={['bottom']} className="bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <LinearGradient
          colors={['#3d3428', '#5c4a35', '#8a7048']}
          style={{ paddingTop: insets.top + 24 }}
          className="h-[32%] px-6"
        >
        <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">
          Loomis
        </Text>
        <Text className="mt-3 text-3xl font-extrabold tracking-tight text-white">{title}</Text>
        {subtitle ? <Text className="mt-2 text-sm text-brand-100">{subtitle}</Text> : null}
      </LinearGradient>
      <ScrollView
        className="-mt-6 flex-1 rounded-t-3xl bg-white"
        contentContainerClassName="px-6 pb-10 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

export function SettingsFormShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeScreen>
      <Text className={cn(MOBILE_THEME.pageTitle, 'px-5 pb-2 pt-4')}>{title}</Text>
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-brand-100/40 bg-white p-5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {footer}
        </View>
      ) : null}
    </SafeScreen>
  );
}
