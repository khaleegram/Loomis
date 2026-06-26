import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicSiteRenderer } from '@/components/website/public-site-renderer';
import { fetchPublicSite } from '@/lib/website/fetch-public-site';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchPublicSite(slug);
  if (!site) return { title: 'School not found' };
  return {
    title: site.seo.title ?? site.schoolName,
    description: site.seo.description ?? `Official website of ${site.schoolName}`,
  };
}

export default async function PublicSchoolSitePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await fetchPublicSite(slug);
  if (!site) notFound();
  return <PublicSiteRenderer site={site} />;
}
