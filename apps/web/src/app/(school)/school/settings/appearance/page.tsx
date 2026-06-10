'use client';

export default function AppearanceSettingsPage() {
  return (
    <section className="max-w-xl">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Loomis V2 uses a fixed premium light interface across the platform.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-medium text-foreground">Colour theme</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Electric Blue — clean canvas, white surfaces, executive spacing.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <span className="size-3 rounded-full bg-brand-500 ring-2 ring-brand-200" aria-hidden />
          <p className="text-sm font-medium text-brand-700">Light mode (always on)</p>
        </div>
      </div>
    </section>
  );
}
