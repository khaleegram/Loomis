import Link from 'next/link';
import { Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from '@loomis/ui-web';

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Academic excellence',
    description: 'Sessions, attendance, gradebook, and exam results — unified.',
  },
  {
    icon: Building2,
    title: 'School operations',
    description: 'Staff onboarding, admissions, and parent communication.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & compliance',
    description: 'Tenant isolation, audit trails, and role-based access.',
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand story — 55% */}
      <section className="relative flex flex-col justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-8 py-14 text-white lg:w-[55%] lg:px-16 dark:from-navy-900 dark:via-navy-800 dark:to-brand-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(56_189_248/0.12),transparent_60%)]"
        />
        <div className="relative max-w-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center border border-sky-400/40 bg-sky-400/10">
              <span className="font-serif text-xl font-bold text-sky-400">L</span>
            </div>
            <span className="font-serif text-3xl font-semibold tracking-tight">Loomis</span>
          </div>
          <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">
            The modern console for Nigerian private schools.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/90 dark:text-sky-400/80">
            From admissions and fee collection to attendance and end-of-term results — one
            trusted platform built for prestige, efficiency, and financial integrity.
          </p>
          <Separator className="my-8 w-20 border-sky-400/50 bg-sky-400/50" />
          <ul className="space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center bg-white/10">
                    <Icon aria-hidden className="size-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="mt-0.5 text-sm text-brand-100/90 dark:text-neutral-400">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Sign-in preview — 45% */}
      <section className="flex flex-1 flex-col items-center justify-center bg-background px-8 py-14">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to your console</CardTitle>
              <CardDescription>
                Access admissions, finance, academics, and settings for your school.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-dashed border-border bg-muted/50 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Secure sign-in with email, password, and two-step verification.
                </p>
              </div>
              <Button className="w-full" size="lg" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need access? Contact your school administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
