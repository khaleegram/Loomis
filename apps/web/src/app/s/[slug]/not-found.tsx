import Link from 'next/link';

export default function PublicSiteNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Loomis</p>
      <h1 className="mt-3 text-2xl font-extrabold text-neutral-900">School website not found</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-600">
        This school has not published a public website yet, or the address may be incorrect.
      </p>
      <Link
        href="https://www.loomis.digital"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-semibold text-white"
      >
        Visit loomis.digital
      </Link>
    </div>
  );
}
