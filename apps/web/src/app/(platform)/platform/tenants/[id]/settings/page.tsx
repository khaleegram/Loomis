'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import {
  tenantContactRole,
  updateTenantContactsRequest,
  updateTenantProfileRequest,
} from '@loomis/contracts';
import type { TenantResponse } from '@loomis/contracts';
import {
  usePlatformTenant,
  useUpdateTenantContacts,
  useUpdateTenantProfile,
} from '@loomis/api-client';
import { Textarea, SmartSearchSelect } from '@loomis/ui-web';

import { PageBody } from '@/components/platform/platform-shell';
import { NIGERIAN_STATE_OPTIONS } from '@/lib/geo/nigerian-states';

const ROLE_LABELS: Record<string, string> = {
  primary: 'Primary',
  billing: 'Billing',
  operations: 'Operations',
  proprietor: 'Proprietor',
};

type ContactDraft = {
  key: string; // local-only temp id
  role: string;
  fullName: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

let nextKey = 1;
function freshKey() {
  return `c${nextKey++}`;
}

function toDrafts(tenant: TenantResponse): ContactDraft[] {
  if (tenant.contacts.length > 0) {
    return tenant.contacts.map((c) => ({
      key: c.id,
      role: c.role,
      fullName: c.fullName ?? tenant.name,
      email: c.email,
      phone: c.phone ?? '',
      isPrimary: c.isPrimary ?? false,
    }));
  }
  return [
    {
      key: freshKey(),
      role: 'primary',
      fullName: tenant.name,
      email: tenant.contactEmail,
      phone: tenant.contactPhone ?? '',
      isPrimary: true,
    },
  ];
}

const inputCls =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold cursor-pointer transition';
const btnSecondary =
  'inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-5 py-2.5 text-[13px] font-semibold text-neutral-700 cursor-pointer transition hover:bg-neutral-50';

export default function TenantSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: tenant, isLoading } = usePlatformTenant(id);

  const updateContacts = useUpdateTenantContacts(id);
  const updateProfile = useUpdateTenantProfile(id);

  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [initRegion, setInitRegion] = useState(false);

  const [contactsMsg, setContactsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [locationMsg, setLocationMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Lazy init from tenant data
  if (tenant && !initialized) {
    setContacts(toDrafts(tenant));
    setInitialized(true);
  }
  if (tenant && !initRegion) {
    setRegion(tenant.region);
    setAddress(tenant.address);
    setInitRegion(true);
  }

  function updateContact(index: number, patch: Partial<ContactDraft>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function setPrimary(index: number) {
    setContacts((prev) => prev.map((c, i) => ({ ...c, isPrimary: i === index })));
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function addContact() {
    setContacts((prev) => [
      ...prev,
      { key: freshKey(), role: 'operations', fullName: '', email: '', phone: '', isPrimary: false },
    ]);
  }

  async function handleSaveContacts() {
    setContactsMsg(null);
    const primaryCount = contacts.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      setContactsMsg({ ok: false, text: 'Mark exactly one contact as primary.' });
      return;
    }
    const input = contacts.map((c) => ({
      role: c.role as any,
      fullName: c.fullName.trim(),
      email: c.email.trim(),
      phone: c.phone?.trim() || undefined,
      isPrimary: c.isPrimary,
    }));
    const parsed = updateTenantContactsRequest.safeParse({ contacts: input });
    if (!parsed.success) {
      setContactsMsg({ ok: false, text: parsed.error.issues[0]?.message ?? 'Check each contact row.' });
      return;
    }
    try {
      await updateContacts.mutateAsync(parsed.data);
      setContactsMsg({ ok: true, text: 'Contacts saved.' });
    } catch (err: any) {
      setContactsMsg({ ok: false, text: err?.message ?? 'Failed to save contacts.' });
    }
  }

  async function handleSaveLocation() {
    setLocationMsg(null);
    const parsed = updateTenantProfileRequest.safeParse({ region, address });
    if (!parsed.success) {
      setLocationMsg({ ok: false, text: parsed.error.issues[0]?.message ?? 'Invalid location.' });
      return;
    }
    try {
      await updateProfile.mutateAsync(parsed.data);
      setLocationMsg({ ok: true, text: 'Location saved.' });
    } catch (err: any) {
      setLocationMsg({ ok: false, text: err?.message ?? 'Failed to save location.' });
    }
  }

  if (isLoading) {
    return (
      <PageBody className="max-w-[800px] px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-neutral-500">Loading…</p>
      </PageBody>
    );
  }

  if (!tenant) {
    return (
      <PageBody className="max-w-[800px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">Tenant not found.</p>
          <Link href="/platform/tenants" className="mt-2 inline-block text-sm text-red-700 underline">
            Back to tenants
          </Link>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[800px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/platform/tenants/${tenant.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-400 hover:text-neutral-600"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          {tenant.name}
        </Link>
        <h1
          className="text-[1.75rem] font-extrabold tracking-[-0.025em] text-neutral-900"
        >
          School settings
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Update contacts, location, and identity for {tenant.name}.
        </p>
      </div>

      <div className="space-y-10">
        {/* ── Contacts ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <User aria-hidden className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[16px] font-extrabold text-neutral-900">School contacts</h2>
              <p className="text-[12px] text-neutral-500">
                Primary contact gets welcome email and owner setup.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {contacts.map((c, i) => (
              <div
                key={c.key}
                className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    Contact {i + 1}{c.isPrimary ? ' · Primary' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    {!c.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => setPrimary(i)}
                        className="cursor-pointer text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        Set primary
                      </button>
                    ) : null}
                    {contacts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeContact(i)}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                        aria-label="Remove contact"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                      Role
                    </label>
                    <select
                      value={c.role}
                      onChange={(e) => updateContact(i, { role: e.target.value })}
                      className={inputCls}
                    >
                      {tenantContactRole.options.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={c.fullName}
                      onChange={(e) => updateContact(i, { fullName: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                      Email
                    </label>
                    <input
                      type="email"
                      value={c.email}
                      onChange={(e) => updateContact(i, { email: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                      Mobile (optional)
                    </label>
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={(e) => updateContact(i, { phone: e.target.value })}
                      placeholder="+2348012345678"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}

            {contacts.length < 10 ? (
              <button
                type="button"
                onClick={addContact}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 py-3 text-[13px] font-semibold text-neutral-500 hover:border-brand-200 hover:text-brand-700 transition"
              >
                <Plus aria-hidden className="size-4" />
                Add another contact
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleSaveContacts()}
              disabled={updateContacts.isPending}
              className={btnPrimary}
              style={{ background: '#c9a96e', color: '#fff' }}
            >
              {updateContacts.isPending ? 'Saving…' : 'Save contacts'}
            </button>
            {contactsMsg ? (
              <p className={`text-[13px] font-semibold ${contactsMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {contactsMsg.text}
              </p>
            ) : null}
          </div>
        </section>

        {/* ── Location ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <MapPin aria-hidden className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[16px] font-extrabold text-neutral-900">School location</h2>
              <p className="text-[12px] text-neutral-500">Region and physical address.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                State / region
              </label>
              <SmartSearchSelect
                variant="field"
                value={region || null}
                onValueChange={(v) => setRegion(v ?? '')}
                options={NIGERIAN_STATE_OPTIONS}
                placeholder="Select state"
                searchPlaceholder="Search states…"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                Address
              </label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-none rounded-xl border-neutral-200 text-[14px]"
                placeholder="123 School Road, GRA"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleSaveLocation()}
              disabled={updateProfile.isPending}
              className={btnPrimary}
              style={{ background: '#c9a96e', color: '#fff' }}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save location'}
            </button>
            {locationMsg ? (
              <p className={`text-[13px] font-semibold ${locationMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {locationMsg.text}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Back link */}
      <div className="mt-10 border-t border-neutral-100 pt-5">
        <Link
          href={`/platform/tenants/${tenant.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back to {tenant.name}
        </Link>
      </div>
    </PageBody>
  );
}
