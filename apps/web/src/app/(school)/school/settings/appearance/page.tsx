'use client';

import { ThemeToggle } from '@/components/settings/theme-toggle';

export default function AppearanceSettingsPage() {
  return (
    <section className="max-w-xl">
      <h2 className="font-serif text-lg font-semibold text-foreground">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how Loomis looks on this device. Your preference is saved locally.
      </p>

      <div className="mt-6 rounded-sm border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-medium text-foreground">Colour theme</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Regent Emerald — classic prestige palette for web and mobile.
        </p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
}
