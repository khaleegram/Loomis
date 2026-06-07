import { Button } from '@loomis/ui-web';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-700">Loomis</h1>
        <p className="max-w-md text-neutral-500">
          School management platform for Nigerian private schools.
        </p>
      </div>
      <Button variant="outline" asChild>
        <a href="/login">Sign in</a>
      </Button>
    </main>
  );
}
