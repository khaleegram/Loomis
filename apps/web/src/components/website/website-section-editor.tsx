'use client';

import type { PublicWebsiteSiteResponse, WebsiteSection, WebsiteSiteResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Button, Input, Label, Skeleton, Textarea } from '@loomis/ui-web';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PublicSiteRenderer } from '@/components/website/public-site-renderer';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useSchoolBranding } from '@loomis/api-client';

const TEMPLATE_OPTIONS = [
  { id: 'prestige', label: 'Prestige', hint: 'Premium secondary' },
  { id: 'bright_start', label: 'Bright Start', hint: 'Nursery & primary' },
  { id: 'academic_trust', label: 'Academic Trust', hint: 'Formal college' },
] as const;

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero banner',
  about: 'About us',
  admissions_cta: 'Admissions',
  contact: 'Contact',
  whatsapp_cta: 'WhatsApp',
  parent_portal_cta: 'Parent portal',
  principal_welcome: 'Principal welcome',
  gallery: 'Gallery',
  faq: 'FAQ',
};

interface WebsiteSectionEditorProps {
  tenantId: string;
  site: WebsiteSiteResponse;
  canEdit: boolean;
  onChange: (sections: WebsiteSection[]) => void;
  onTemplateChange: (templateId: WebsiteSiteResponse['templateId']) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WebsiteSectionEditor({
  tenantId,
  site,
  canEdit,
  onChange,
  onTemplateChange,
  onSave,
  isSaving,
}: WebsiteSectionEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(site.sections[0]?.id ?? null);
  const [showPreview, setShowPreview] = useState(true);
  const { data: branding } = useSchoolBranding(tenantId);

  const sortedSections = useMemo(
    () => [...site.sections].sort((a, b) => a.order - b.order),
    [site.sections],
  );

  const previewSite: PublicWebsiteSiteResponse = useMemo(
    () => ({
      slug: site.slug,
      schoolName: branding?.tenantName ?? 'School',
      templateId: site.templateId,
      theme: site.theme,
      sections: site.sections,
      seo: site.seo,
      contact: {
        email: null,
        phone: null,
        address: null,
      },
      logoUrl: null,
      resolvedAssets: {},
      publishedAt: new Date().toISOString(),
    }),
    [site, branding?.tenantName],
  );

  function updateSection(id: string, patch: Partial<WebsiteSection>) {
    onChange(
      site.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function moveSection(id: string, direction: -1 | 1) {
    const ordered = [...sortedSections];
    const idx = ordered.findIndex((s) => s.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const next = [...ordered];
    const a = next[idx]!;
    const b = next[swapIdx]!;
    next[idx] = { ...b, order: a.order };
    next[swapIdx] = { ...a, order: b.order };
    onChange(next);
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-100/40 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Template</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {TEMPLATE_OPTIONS.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                disabled={!canEdit}
                onClick={() => onTemplateChange(tpl.id)}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  site.templateId === tpl.id
                    ? 'border-brand-400 bg-brand-50 font-semibold text-brand-900'
                    : 'border-neutral-200 hover:border-brand-200'
                }`}
              >
                <span className="block font-medium">{tpl.label}</span>
                <span className="text-[11px] text-neutral-500">{tpl.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100/40 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-bold text-neutral-900">Sections</h2>
            <p className="text-xs text-neutral-500">Reorder and edit each block on your site.</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {sortedSections.map((section) => {
              const open = expandedId === section.id;
              const props = section.props as Record<string, string>;
              return (
                <li key={section.id}>
                  <div className="flex items-center gap-2 px-3 py-3">
                    <GripVertical className="size-4 shrink-0 text-neutral-300" aria-hidden />
                    <button
                      type="button"
                      className="min-h-[44px] flex-1 text-left text-sm font-medium"
                      onClick={() => setExpandedId(open ? null : section.id)}
                    >
                      {SECTION_LABELS[section.type] ?? section.type}
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                      onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                      aria-label={section.enabled ? 'Hide section' : 'Show section'}
                    >
                      {section.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                      onClick={() => moveSection(section.id, -1)}
                      aria-label="Move up"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                      onClick={() => moveSection(section.id, 1)}
                      aria-label="Move down"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  {open ? (
                    <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/50 px-5 py-4">
                      {section.type === 'hero' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-headline`}>Headline</Label>
                            <Input
                              id={`${section.id}-headline`}
                              disabled={!canEdit}
                              value={props.headline ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, headline: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${section.id}-sub`}>Subheadline</Label>
                            <Input
                              id={`${section.id}-sub`}
                              disabled={!canEdit}
                              value={props.subheadline ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, subheadline: e.target.value },
                                })
                              }
                            />
                          </div>
                        </>
                      ) : null}
                      {section.type === 'about' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-title`}>Title</Label>
                            <Input
                              id={`${section.id}-title`}
                              disabled={!canEdit}
                              value={props.title ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, title: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${section.id}-body`}>Body</Label>
                            <Textarea
                              id={`${section.id}-body`}
                              disabled={!canEdit}
                              rows={5}
                              value={props.body ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, body: e.target.value },
                                })
                              }
                            />
                          </div>
                        </>
                      ) : null}
                      {section.type === 'admissions_cta' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-title`}>Title</Label>
                            <Input
                              id={`${section.id}-title`}
                              disabled={!canEdit}
                              value={props.title ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, title: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${section.id}-body`}>Description</Label>
                            <Textarea
                              id={`${section.id}-body`}
                              disabled={!canEdit}
                              rows={3}
                              value={props.body ?? ''}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, body: e.target.value },
                                })
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canEdit ? (
            <div className="border-t border-neutral-100 p-4">
              <button
                type="button"
                className={ACADEMIC_UI.btnPrimary}
                disabled={isSaving}
                onClick={onSave}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Preview</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showPreview ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-lg">
            <div className="max-h-[80vh] overflow-y-auto">
              <PublicSiteRenderer site={previewSite} />
            </div>
          </div>
        ) : (
          <Alert>
            <AlertDescription>Preview hidden — toggle Show to see your draft layout.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export function WebsiteEditorSkeleton() {
  return <Skeleton className="h-96 w-full rounded-2xl" />;
}
