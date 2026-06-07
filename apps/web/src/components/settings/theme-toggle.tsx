'use client';

import { Button, cn } from '@loomis/ui-web';
import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type Theme } from '@/components/providers/theme-provider';

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Warm linen canvas with deep emerald accents.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Midnight Forest with mint-green highlights.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device light or dark preference.',
    icon: Monitor,
  },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-sm border border-border bg-muted p-1"
        role="radiogroup"
        aria-label="Colour theme"
      >
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = theme === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              className={cn('gap-2', selected && 'shadow-xs')}
              onClick={() => setTheme(option.value)}
            >
              <Icon aria-hidden className="size-4" />
              {option.label}
            </Button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {theme === 'system'
          ? `Using system preference (${resolvedTheme === 'dark' ? 'dark' : 'light'} mode active).`
          : `${theme === 'dark' ? 'Dark' : 'Light'} mode is active across Loomis on this device.`}
      </p>
    </div>
  );
}
