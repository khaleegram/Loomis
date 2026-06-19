'use client';

import { Laptop, Moon, Sun } from 'lucide-react';

import { cn } from '@loomis/ui-web';

import { useTheme, type ThemePreference } from '@/components/providers/theme-provider';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun; description: string }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Premium light interface — default Loomis look.',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Deep umber surfaces with high-contrast text — Apple & Material style.',
  },
  {
    value: 'system',
    label: 'System',
    icon: Laptop,
    description: 'Follow your device appearance setting.',
  },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors',
                active
                  ? 'border-brand-300 bg-brand-50/80 ring-1 ring-brand-200/60 dark:border-brand-600/40 dark:bg-brand-900/20 dark:ring-brand-700/40'
                  : 'border-border bg-card hover:border-brand-200/80 hover:bg-muted/40',
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg',
                  active ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">{option.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Active appearance:{' '}
        <span className="font-semibold text-foreground capitalize">{resolvedTheme}</span>
        {theme === 'system' ? ' (from system)' : null}
      </p>
    </div>
  );
}
