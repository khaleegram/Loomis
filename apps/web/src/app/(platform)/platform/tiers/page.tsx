'use client';

import { useEffect, useState } from 'react';
import { formatKobo } from '@loomis/core';
import { Layers, Pencil, Plus, Zap } from 'lucide-react';
import {
  Button,
  CurrencyInput,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@loomis/ui-web';
import { useCreateTier, usePlatformTiers, useUpdateTier } from '@loomis/api-client';
import type { TierSummary } from '@loomis/contracts';

import { PageBody } from '@/components/platform/platform-shell';
import { useAuth } from '@/lib/auth/auth-context';

export default function PlatformTiersPage() {
  const { session } = useAuth();
  const { data, isLoading } = usePlatformTiers();
  const createTier = useCreateTier();
  const [editTier, setEditTier] = useState<TierSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const roleLabel = session?.role?.replace(/_/g, ' ') ?? 'Platform';

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Zap aria-hidden className="size-4 text-brand-600" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              Platform Console
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Product tiers, <span className="text-brand-600">{roleLabel}.</span>
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Manage commercial plans used when provisioning schools.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800"
        >
          <Plus aria-hidden className="size-3.5" />
          Add tier
        </button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-3">
          {['Tier', 'Default PSF', 'Max students', 'Type', ''].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {h}
            </p>
          ))}
        </div>
        <div className="divide-y divide-neutral-100">
          {isLoading ? (
            <p className="px-5 py-8 text-[13px] text-neutral-400">Loading tiers…</p>
          ) : (
            (data?.tiers ?? []).map((tier) => (
              <div
                key={tier.id}
                className="grid grid-cols-[1fr_120px_120px_100px_80px] items-center gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
                    <Layers aria-hidden className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-neutral-900">{tier.name}</p>
                    <p className="text-[11px] font-mono text-neutral-400">{tier.code}</p>
                  </div>
                </div>
                <p className="text-[13px] font-bold tabular-nums">{formatKobo(tier.defaultPsfRateMinor)}</p>
                <p className="text-[13px] text-neutral-600">
                  {tier.maxStudents != null ? tier.maxStudents.toLocaleString() : 'Unlimited'}
                </p>
                <p className="text-[11px] font-semibold uppercase text-neutral-500">
                  {tier.isSystem ? 'System' : 'Custom'}
                </p>
                <button
                  type="button"
                  onClick={() => setEditTier(tier)}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  <Pencil aria-hidden className="size-3" />
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <TierEditorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onCreate={createTier.mutateAsync}
      />
      {editTier ? (
        <TierEditorDialog
          open={Boolean(editTier)}
          onOpenChange={(open) => !open && setEditTier(null)}
          mode="edit"
          tier={editTier}
        />
      ) : null}
    </PageBody>
  );
}

function TierEditorDialog({
  open,
  onOpenChange,
  mode,
  tier,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  tier?: TierSummary;
  onCreate?: (body: import('@loomis/contracts').CreateTierRequest) => Promise<TierSummary>;
}) {
  const updateTier = useUpdateTier(tier?.id ?? '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateMinor, setRateMinor] = useState(100_000);
  const [maxStudents, setMaxStudents] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (tier) {
      setName(tier.name);
      setDescription(tier.description ?? '');
      setRateMinor(tier.defaultPsfRateMinor);
      setMaxStudents(tier.maxStudents != null ? String(tier.maxStudents) : '');
    } else {
      setCode('');
      setName('');
      setDescription('');
      setRateMinor(100_000);
      setMaxStudents('');
    }
  }, [open, tier]);

  async function handleSave() {
    if (mode === 'create' && onCreate) {
      await onCreate({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        defaultPsfRateMinor: rateMinor,
        maxStudents: maxStudents ? Number(maxStudents) : null,
      });
    } else if (tier) {
      await updateTier.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        defaultPsfRateMinor: rateMinor,
        maxStudents: maxStudents ? Number(maxStudents) : null,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add product tier' : 'Edit product tier'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {mode === 'create' ? (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Code
              </p>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="advanced_plus" />
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Name
            </p>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Description
            </p>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Default PSF
            </p>
            <CurrencyInput valueKobo={rateMinor} onChangeKobo={setRateMinor} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Max students
            </p>
            <Input
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="Leave blank for unlimited"
              inputMode="numeric"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
