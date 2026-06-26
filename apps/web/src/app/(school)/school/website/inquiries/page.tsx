'use client';

import {
  useUpdateWebsiteInquiry,
  useWebsiteInquiries,
} from '@loomis/api-client';
import type { WebsiteInquiryResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Badge, Button, Skeleton } from '@loomis/ui-web';
import { Archive, CheckCircle2, Mail, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { SURFACES } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'New', value: 'new' },
  { label: 'Read', value: 'read' },
  { label: 'Archived', value: 'archived' },
] as const;

function inquiryLabel(type: WebsiteInquiryResponse['type']): string {
  return type === 'admission_interest' ? 'Admission interest' : 'Contact enquiry';
}

function statusTone(status: WebsiteInquiryResponse['status']): string {
  if (status === 'new') return 'bg-gold-50 text-gold-700 border-gold-200';
  if (status === 'read') return 'bg-accent-green-50 text-accent-green-700 border-accent-green-200';
  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

function childSummary(metadata: Record<string, unknown>): string | null {
  const childFirstName = typeof metadata.childFirstName === 'string' ? metadata.childFirstName : null;
  const childLastName = typeof metadata.childLastName === 'string' ? metadata.childLastName : null;
  const classInterest = typeof metadata.classInterest === 'string' ? metadata.classInterest : null;
  const name = [childFirstName, childLastName].filter(Boolean).join(' ');
  if (!name && !classInterest) return null;
  return [name, classInterest ? `Class: ${classInterest}` : null].filter(Boolean).join(' · ');
}

function InquiryCard({
  inquiry,
  onMarkRead,
  onArchive,
  isUpdating,
}: {
  inquiry: WebsiteInquiryResponse;
  onMarkRead: (inquiryId: string) => void;
  onArchive: (inquiryId: string) => void;
  isUpdating: boolean;
}) {
  const child = childSummary(inquiry.metadata);

  return (
    <article className="rounded-2xl border border-brand-100/40 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusTone(inquiry.status)}>
              {inquiry.status}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {inquiryLabel(inquiry.type)}
            </span>
          </div>
          <h2 className="mt-2 text-base font-extrabold text-neutral-900">
            {inquiry.submitterName}
          </h2>
          {child ? <p className="mt-1 text-sm text-neutral-500">{child}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {inquiry.status === 'new' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onMarkRead(inquiry.id)}
              className="min-h-[40px]"
            >
              <CheckCircle2 className="mr-1 size-4" aria-hidden />
              Mark read
            </Button>
          ) : null}
          {inquiry.status !== 'archived' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onArchive(inquiry.id)}
              className="min-h-[40px]"
            >
              <Archive className="mr-1 size-4" aria-hidden />
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-neutral-700">{inquiry.message}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-600">
        <a href={`mailto:${inquiry.submitterEmail}`} className="inline-flex items-center gap-1.5 hover:underline">
          <Mail className="size-4" aria-hidden />
          {inquiry.submitterEmail}
        </a>
        {inquiry.submitterPhone ? (
          <a href={`tel:${inquiry.submitterPhone}`} className="inline-flex items-center gap-1.5 hover:underline">
            <Phone className="size-4" aria-hidden />
            {inquiry.submitterPhone}
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        Received {new Date(inquiry.createdAt).toLocaleString()}
      </p>
    </article>
  );
}

export default function WebsiteInquiriesPage() {
  const tenantId = useTenantId() ?? '';
  const canViewInquiries = useCan('website.inquiries.view');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = useWebsiteInquiries(tenantId, status);
  const updateInquiry = useUpdateWebsiteInquiry(tenantId);

  const counts = useMemo(() => {
    const inquiries = data?.inquiries ?? [];
    return {
      total: data?.total ?? 0,
      new: inquiries.filter((item) => item.status === 'new').length,
      admission: inquiries.filter((item) => item.type === 'admission_interest').length,
    };
  }, [data]);

  if (!tenantId) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <p className="text-sm text-muted-foreground">No school context.</p>
      </PageBody>
    );
  }

  if (!canViewInquiries) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <Alert variant="destructive">
          <AlertDescription>You do not have access to website enquiries.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
      <section className="relative overflow-hidden rounded-2xl border border-brand-100/40 shadow-sm">
        <div className="px-4 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10" style={{ background: SURFACES.hero }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Website enquiries
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Public website inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Contact messages and admission interest forms from your public school website.
          </p>
        </div>
        <div className="relative z-10 -mt-10 grid grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:px-8">
          {[
            { label: 'Total enquiries', value: counts.total },
            { label: 'New', value: counts.new },
            { label: 'Admission interest', value: counts.admission },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/60 bg-white p-4 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={
              status === filter.value
                ? ACADEMIC_UI.btnPrimary
                : 'min-h-[44px] rounded-xl border border-brand-100/40 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-brand-50/50'
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>Could not load website enquiries. Try again shortly.</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        ) : data?.inquiries.length ? (
          data.inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              isUpdating={updateInquiry.isPending}
              onMarkRead={(inquiryId) => updateInquiry.mutate({ inquiryId, status: 'read' })}
              onArchive={(inquiryId) => updateInquiry.mutate({ inquiryId, status: 'archived' })}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-100 bg-white p-8 text-center">
            <h2 className="text-base font-extrabold text-neutral-900">No enquiries yet</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Enable the contact or admission form in your website editor, then publish the site.
            </p>
          </div>
        )}
      </div>
    </PageBody>
  );
}
