import type { PublicWebsiteSiteResponse, WebsiteSection } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { Mail, MapPin, Phone } from 'lucide-react';

import { getAppLoginUrl } from '@/lib/website/public-site-url';

function assetUrl(
  resolvedAssets: Record<string, string>,
  storageObjectId: string | null | undefined,
): string | null {
  if (!storageObjectId) return null;
  return resolvedAssets[storageObjectId] ?? null;
}

function SectionBlock({
  section,
  site,
}: {
  section: WebsiteSection;
  site: PublicWebsiteSiteResponse;
}) {
  const props = section.props as Record<string, unknown>;
  const resolved = site.resolvedAssets;

  switch (section.type) {
    case 'hero': {
      const bg = assetUrl(resolved, props.backgroundStorageObjectId as string | undefined);
      return (
        <section
          className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28"
          style={{
            background: bg
              ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url(${bg}) center/cover`
              : `linear-gradient(135deg, ${site.theme.primaryColor}22, ${site.theme.accentColor}ee)`,
          }}
        >
          <div className="relative mx-auto max-w-4xl text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              {(props.headline as string) || site.schoolName}
            </h1>
            {props.subheadline ? (
              <p className="mt-4 text-base text-white/90 sm:text-lg">{props.subheadline as string}</p>
            ) : null}
            {props.ctaLabel ? (
              <a
                href={(props.ctaHref as string) || '#contact'}
                className="mt-8 inline-flex min-h-[44px] items-center rounded-full px-6 py-3 text-sm font-semibold text-neutral-900"
                style={{ backgroundColor: site.theme.primaryColor }}
              >
                {props.ctaLabel as string}
              </a>
            ) : null}
          </div>
        </section>
      );
    }
    case 'about':
      return (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-8" id="about">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">About</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                {(props.title as string) || 'About Us'}
              </h2>
              <p className="mt-4 whitespace-pre-line text-neutral-600">{(props.body as string) || ''}</p>
            </div>
            {assetUrl(resolved, props.imageStorageObjectId as string | undefined) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(resolved, props.imageStorageObjectId as string)!}
                alt=""
                className="w-full rounded-2xl object-cover shadow-lg"
              />
            ) : null}
          </div>
        </section>
      );
    case 'admissions_cta':
      return (
        <section
          className="mx-auto max-w-5xl px-4 py-12 sm:px-8"
          id="admissions"
          style={{ backgroundColor: `${site.theme.primaryColor}14` }}
        >
          <div className="rounded-2xl border border-brand-100/50 bg-white/80 p-8 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold text-neutral-900">
              {(props.title as string) || 'Admissions'}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-neutral-600">{(props.body as string) || ''}</p>
            <a
              href="#contact"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-full px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: site.theme.accentColor }}
            >
              {(props.buttonLabel as string) || 'Contact Us'}
            </a>
          </div>
        </section>
      );
    case 'contact':
      return (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-8" id="contact">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Contact</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900">Get in touch</h2>
          <div className="mt-6 space-y-4 text-neutral-700">
            {props.showEmail !== false && site.contact.email ? (
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden />
                <a href={`mailto:${site.contact.email}`} className="hover:underline">
                  {site.contact.email}
                </a>
              </p>
            ) : null}
            {props.showPhone !== false && site.contact.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" aria-hidden />
                <a href={`tel:${site.contact.phone}`} className="hover:underline">
                  {site.contact.phone}
                </a>
              </p>
            ) : null}
            {site.contact.address ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{site.contact.address}</span>
              </p>
            ) : null}
          </div>
        </section>
      );
    case 'whatsapp_cta': {
      const phone = (props.phoneE164 as string) || site.contact.phone;
      if (!phone) return null;
      const digits = phone.replace(/\D/g, '');
      const message = encodeURIComponent((props.prefillMessage as string) || 'Hello, I would like to enquire about admissions.');
      return (
        <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-8">
          <a
            href={`https://wa.me/${digits}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center rounded-2xl bg-[#25D366] px-6 py-4 text-sm font-semibold text-white shadow-md"
          >
            Chat on WhatsApp
          </a>
        </section>
      );
    }
    case 'parent_portal_cta':
      return (
        <section className="border-t border-neutral-100 bg-neutral-50 px-4 py-12 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-extrabold text-neutral-900">
              {(props.title as string) || 'Parents'}
            </h2>
            <p className="mt-2 text-neutral-600">{(props.body as string) || ''}</p>
            <a
              href={getAppLoginUrl()}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Parent portal login
            </a>
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function PublicSiteRenderer({
  site,
  className,
}: {
  site: PublicWebsiteSiteResponse;
  className?: string;
}) {
  const sections = [...site.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const fontClass =
    site.theme.fontStyle === 'classic'
      ? 'font-serif'
      : site.theme.fontStyle === 'friendly'
        ? 'font-sans'
        : 'font-sans';

  return (
    <div className={cn('min-h-screen bg-white text-neutral-900', fontClass, className)}>
      <header className="border-b border-neutral-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt="" className="size-10 rounded-lg object-contain" />
            ) : null}
            <span className="text-lg font-extrabold tracking-tight">{site.schoolName}</span>
          </div>
          <a
            href="#contact"
            className="hidden min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-semibold text-white sm:inline-flex"
            style={{ backgroundColor: site.theme.primaryColor }}
          >
            Contact
          </a>
        </div>
      </header>

      <main>
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} site={site} />
        ))}
      </main>

      <footer className="border-t border-neutral-100 px-4 py-8 text-center text-xs text-neutral-500 sm:px-8">
        <p>
          © {new Date().getFullYear()} {site.schoolName}
        </p>
        <p className="mt-2">
          Powered by{' '}
          <a href="https://www.loomis.digital" className="font-medium text-brand-600 hover:underline">
            Loomis
          </a>
        </p>
      </footer>
    </div>
  );
}
