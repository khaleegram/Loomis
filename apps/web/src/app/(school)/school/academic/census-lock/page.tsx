import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CensusLockRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  redirect(`/school/academic/platform-billing${suffix}`);
}
