import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy academic route → finance platform fee (auto billing, read-only). */
export default async function PlatformBillingRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const suffix = typeof params.termId === 'string' ? `?term=${params.termId}` : '';
  redirect(`/school/finance/platform-fee${suffix}`);
}
