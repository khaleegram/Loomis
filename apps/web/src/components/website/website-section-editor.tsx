'use client';

import type {
  PublicWebsiteSiteResponse,
  WebsiteSection,
  WebsiteSectionType,
  WebsiteSeo,
  WebsiteSiteResponse,
  WebsiteTheme,
} from '@loomis/contracts';
import { Alert, AlertDescription, Button, Input, Label, Skeleton, Textarea } from '@loomis/ui-web';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { PublicSiteRenderer } from '@/components/website/public-site-renderer';
import { WebsiteImageField } from '@/components/website/website-image-field';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { schoolPublicSiteUrl } from '@/lib/website/public-site-url';
import { useCheckWebsiteSlug, useSchoolBranding } from '@loomis/api-client';

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

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Section types a school can add manually (hero/about/contact ship by default). */
const ADDABLE_SECTIONS: WebsiteSectionType[] = [
  'principal_welcome',
  'gallery',
  'faq',
  'whatsapp_cta',
  'parent_portal_cta',
  'admissions_cta',
];

function defaultPropsFor(type: WebsiteSectionType): Record<string, unknown> {
  switch (type) {
    case 'principal_welcome':
      return { name: '', role: 'Principal', message: '' };
    case 'gallery':
      return { title: 'Life at our school', images: [] };
    case 'faq':
      return { title: 'Frequently asked questions', items: [] };
    case 'whatsapp_cta':
      return { prefillMessage: 'Hello, I would like to enquire about admissions.' };
    case 'parent_portal_cta':
      return {
        title: 'Parents',
        body: 'Access fees, attendance, and school updates through the Loomis parent portal.',
      };
    case 'admissions_cta':
      return { title: 'Join Our School', body: '', buttonLabel: 'Enquire Now', formEnabled: true };
    default:
      return {};
  }
}

interface WebsiteSectionEditorProps {
  tenantId: string;
  site: WebsiteSiteResponse;
  canEdit: boolean;
  onChange: (sections: WebsiteSection[]) => void;
  onSlugChange: (slug: string) => void;
  onTemplateChange: (templateId: WebsiteSiteResponse['templateId']) => void;
  onThemeChange: (theme: WebsiteTheme) => void;
  onSeoChange: (seo: WebsiteSeo) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WebsiteSectionEditor({
  tenantId,
  site,
  canEdit,
  onChange,
  onSlugChange,
  onTemplateChange,
  onThemeChange,
  onSeoChange,
  onSave,
  isSaving,
}: WebsiteSectionEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(site.sections[0]?.id ?? null);
  const [showPreview, setShowPreview] = useState(true);
  const { data: branding } = useSchoolBranding(tenantId);
  const slugCheck = useCheckWebsiteSlug(tenantId);

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

  function addSection(type: WebsiteSectionType) {
    const nextOrder = site.sections.reduce((max, s) => Math.max(max, s.order), -1) + 1;
    const newSection: WebsiteSection = {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      order: nextOrder,
      props: defaultPropsFor(type),
    };
    onChange([...site.sections, newSection]);
    setExpandedId(newSection.id);
  }

  function removeSection(id: string) {
    onChange(site.sections.filter((s) => s.id !== id));
  }

  const existingTypes = new Set(site.sections.map((s) => s.type));
  const addableTypes = ADDABLE_SECTIONS.filter((t) => !existingTypes.has(t));

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-100/40 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Website address
          </p>
          <h2 className="mt-2 text-sm font-bold text-neutral-900">Choose your one-word slug</h2>
          <p className="mt-1 text-xs text-neutral-500">
            This is the public address parents will type. Example: grace.loomis.digital
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="website-slug">School website word</Label>
              <div className="mt-1 flex min-h-[44px] overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-brand-400">
                <Input
                  id="website-slug"
                  disabled={!canEdit}
                  value={site.slug}
                  onChange={(e) =>
                    onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  }
                  className="min-h-[44px] flex-1 border-0 shadow-none focus-visible:ring-0"
                  placeholder="grace"
                />
                <span className="inline-flex items-center bg-neutral-50 px-3 text-sm font-medium text-neutral-500">
                  .loomis.digital
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit || slugCheck.isPending || site.slug.length < 3}
              onClick={() => slugCheck.mutate(site.slug)}
              className="min-h-[44px]"
            >
              {slugCheck.isPending ? 'Checking…' : 'Check'}
            </Button>
          </div>

          <div className="mt-3 text-xs">
            {slugCheck.data?.available ? (
              <p className="flex items-center gap-1.5 text-accent-green-700">
                <CheckCircle2 className="size-4" aria-hidden />
                Available: {schoolPublicSiteUrl(slugCheck.data.slug).replace(/^https?:\/\//, '')}
              </p>
            ) : slugCheck.data ? (
              <p className="flex items-center gap-1.5 text-danger">
                <XCircle className="size-4" aria-hidden />
                {slugCheck.data.reason === 'taken'
                  ? 'That word is already taken.'
                  : slugCheck.data.reason === 'reserved'
                    ? 'That word is reserved by Loomis.'
                    : 'Use one word only: lowercase letters and numbers.'}
              </p>
            ) : (
              <p className="text-neutral-500">
                Use lowercase letters and numbers only. No spaces, dots, or hyphens.
              </p>
            )}
          </div>
        </div>

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
              const props = section.props as Record<string, unknown>;
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
                    {ADDABLE_SECTIONS.includes(section.type) ? (
                      <button
                        type="button"
                        disabled={!canEdit}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => removeSection(section.id)}
                        aria-label="Remove section"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
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
                              value={textValue(props.headline)}
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
                              value={textValue(props.subheadline)}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, subheadline: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`${section.id}-cta`}>Button label</Label>
                              <Input
                                id={`${section.id}-cta`}
                                disabled={!canEdit}
                                value={textValue(props.ctaLabel)}
                                placeholder="Admissions"
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    props: { ...props, ctaLabel: e.target.value },
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${section.id}-href`}>Button link</Label>
                              <Input
                                id={`${section.id}-href`}
                                disabled={!canEdit}
                                value={textValue(props.ctaHref)}
                                placeholder="#admissions"
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    props: { ...props, ctaHref: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>
                          <WebsiteImageField
                            tenantId={tenantId}
                            label="Background image"
                            disabled={!canEdit}
                            storageObjectId={textValue(props.backgroundStorageObjectId) || null}
                            onChange={(id) =>
                              updateSection(section.id, {
                                props: { ...props, backgroundStorageObjectId: id },
                              })
                            }
                          />
                        </>
                      ) : null}
                      {section.type === 'about' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-title`}>Title</Label>
                            <Input
                              id={`${section.id}-title`}
                              disabled={!canEdit}
                              value={textValue(props.title)}
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
                              value={textValue(props.body)}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, body: e.target.value },
                                })
                              }
                            />
                          </div>
                          <WebsiteImageField
                            tenantId={tenantId}
                            label="Section image (optional)"
                            disabled={!canEdit}
                            storageObjectId={textValue(props.imageStorageObjectId) || null}
                            onChange={(id) =>
                              updateSection(section.id, {
                                props: { ...props, imageStorageObjectId: id },
                              })
                            }
                          />
                        </>
                      ) : null}
                      {section.type === 'principal_welcome' ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`${section.id}-name`}>Name</Label>
                              <Input
                                id={`${section.id}-name`}
                                disabled={!canEdit}
                                value={textValue(props.name)}
                                placeholder="Mrs. Adaeze Okeke"
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    props: { ...props, name: e.target.value },
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${section.id}-role`}>Title / role</Label>
                              <Input
                                id={`${section.id}-role`}
                                disabled={!canEdit}
                                value={textValue(props.role)}
                                placeholder="Principal"
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    props: { ...props, role: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`${section.id}-message`}>Message</Label>
                            <Textarea
                              id={`${section.id}-message`}
                              disabled={!canEdit}
                              rows={5}
                              value={textValue(props.message)}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, message: e.target.value },
                                })
                              }
                            />
                          </div>
                          <WebsiteImageField
                            tenantId={tenantId}
                            label="Principal photo"
                            frameClassName="aspect-square max-w-[160px]"
                            disabled={!canEdit}
                            storageObjectId={textValue(props.photoStorageObjectId) || null}
                            onChange={(id) =>
                              updateSection(section.id, {
                                props: { ...props, photoStorageObjectId: id },
                              })
                            }
                          />
                        </>
                      ) : null}
                      {section.type === 'gallery' ? (
                        <GalleryEditor
                          tenantId={tenantId}
                          canEdit={canEdit}
                          props={props}
                          onChange={(patch) => updateSection(section.id, { props: patch })}
                        />
                      ) : null}
                      {section.type === 'faq' ? (
                        <FaqEditor
                          canEdit={canEdit}
                          props={props}
                          onChange={(patch) => updateSection(section.id, { props: patch })}
                        />
                      ) : null}
                      {section.type === 'whatsapp_cta' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-phone`}>WhatsApp number</Label>
                            <Input
                              id={`${section.id}-phone`}
                              disabled={!canEdit}
                              value={textValue(props.phoneE164)}
                              placeholder="+2348012345678 (leave blank to use school phone)"
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, phoneE164: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${section.id}-prefill`}>Pre-filled message</Label>
                            <Textarea
                              id={`${section.id}-prefill`}
                              disabled={!canEdit}
                              rows={2}
                              value={textValue(props.prefillMessage)}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, prefillMessage: e.target.value },
                                })
                              }
                            />
                          </div>
                        </>
                      ) : null}
                      {section.type === 'parent_portal_cta' ? (
                        <>
                          <div>
                            <Label htmlFor={`${section.id}-title`}>Title</Label>
                            <Input
                              id={`${section.id}-title`}
                              disabled={!canEdit}
                              value={textValue(props.title)}
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
                              rows={3}
                              value={textValue(props.body)}
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
                              value={textValue(props.title)}
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
                              value={textValue(props.body)}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, body: e.target.value },
                                })
                              }
                            />
                          </div>
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={props.formEnabled === true}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, formEnabled: e.target.checked },
                                })
                              }
                              className="size-4 rounded border-neutral-300"
                            />
                            Show admission enquiry form on live site
                          </label>
                        </>
                      ) : null}
                      {section.type === 'contact' ? (
                        <>
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={props.formEnabled === true}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  props: { ...props, formEnabled: e.target.checked },
                                })
                              }
                              className="size-4 rounded border-neutral-300"
                            />
                            Show contact form on live site
                          </label>
                          <p className="text-xs text-neutral-500">
                            Enquiries arrive in Website → Enquiries and email your school contact.
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canEdit && addableTypes.length > 0 ? (
            <div className="border-t border-neutral-100 px-3 py-3">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Add a section
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {addableTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addSection(type)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {SECTION_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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

        <div className="rounded-2xl border border-brand-100/40 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Theme</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="theme-primary">Primary colour</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="theme-primary"
                  type="color"
                  disabled={!canEdit}
                  value={site.theme.primaryColor}
                  onChange={(e) => onThemeChange({ ...site.theme, primaryColor: e.target.value })}
                  className="size-10 cursor-pointer rounded-lg border border-neutral-200"
                />
                <span className="text-xs text-neutral-500">{site.theme.primaryColor}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="theme-accent">Accent colour</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="theme-accent"
                  type="color"
                  disabled={!canEdit}
                  value={site.theme.accentColor}
                  onChange={(e) => onThemeChange({ ...site.theme, accentColor: e.target.value })}
                  className="size-10 cursor-pointer rounded-lg border border-neutral-200"
                />
                <span className="text-xs text-neutral-500">{site.theme.accentColor}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label>Font style</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['modern', 'classic', 'friendly'] as const).map((font) => (
                <button
                  key={font}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onThemeChange({ ...site.theme, fontStyle: font })}
                  className={`min-h-[44px] rounded-xl border px-3 text-sm capitalize transition-colors ${
                    site.theme.fontStyle === font
                      ? 'border-brand-400 bg-brand-50 font-semibold text-brand-900'
                      : 'border-neutral-200 hover:border-brand-200'
                  }`}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100/40 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Search &amp; sharing (SEO)
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            How your site appears on Google and when shared on WhatsApp or social media.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="seo-title">Page title</Label>
              <Input
                id="seo-title"
                disabled={!canEdit}
                value={site.seo.title ?? ''}
                placeholder="Grace International School — Admissions Open"
                maxLength={120}
                onChange={(e) =>
                  onSeoChange({ ...site.seo, title: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label htmlFor="seo-desc">Description</Label>
              <Textarea
                id="seo-desc"
                disabled={!canEdit}
                rows={3}
                value={site.seo.description ?? ''}
                placeholder="A short summary of your school shown in search results."
                maxLength={320}
                onChange={(e) =>
                  onSeoChange({ ...site.seo, description: e.target.value || null })
                }
              />
            </div>
            <WebsiteImageField
              tenantId={tenantId}
              label="Share image (Open Graph)"
              disabled={!canEdit}
              storageObjectId={site.seo.ogImageStorageObjectId}
              onChange={(id) => onSeoChange({ ...site.seo, ogImageStorageObjectId: id })}
            />
          </div>
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

interface SubEditorProps {
  canEdit: boolean;
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

function GalleryEditor({
  tenantId,
  canEdit,
  props,
  onChange,
}: SubEditorProps & { tenantId: string }) {
  const images = Array.isArray(props.images)
    ? (props.images as Array<{ storageObjectId: string | null; caption?: string }>)
    : [];

  const updateImages = (next: Array<{ storageObjectId: string | null; caption?: string }>) =>
    onChange({ ...props, images: next });

  return (
    <>
      <div>
        <Label htmlFor="gallery-title">Section title</Label>
        <Input
          id="gallery-title"
          disabled={!canEdit}
          value={textValue(props.title)}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        {images.map((img, idx) => (
          <div key={idx} className="rounded-xl border border-neutral-200 p-3">
            <WebsiteImageField
              tenantId={tenantId}
              label={`Image ${idx + 1}`}
              frameClassName="aspect-square max-w-[140px]"
              disabled={!canEdit}
              storageObjectId={img.storageObjectId ?? null}
              onChange={(id) =>
                updateImages(
                  images.map((im, i) => (i === idx ? { ...im, storageObjectId: id } : im)),
                )
              }
            />
            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`gallery-cap-${idx}`}>Caption (optional)</Label>
                <Input
                  id={`gallery-cap-${idx}`}
                  disabled={!canEdit}
                  value={img.caption ?? ''}
                  onChange={(e) =>
                    updateImages(
                      images.map((im, i) =>
                        i === idx ? { ...im, caption: e.target.value } : im,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                disabled={!canEdit}
                className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => updateImages(images.filter((_, i) => i !== idx))}
                aria-label="Remove image"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {canEdit && images.length < 12 ? (
        <button
          type="button"
          onClick={() => updateImages([...images, { storageObjectId: null }])}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:border-brand-300"
        >
          <Plus className="size-3.5" aria-hidden /> Add image
        </button>
      ) : null}
    </>
  );
}

function FaqEditor({ canEdit, props, onChange }: SubEditorProps) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ question: string; answer: string }>)
    : [];

  const updateItems = (next: Array<{ question: string; answer: string }>) =>
    onChange({ ...props, items: next });

  return (
    <>
      <div>
        <Label htmlFor="faq-title">Section title</Label>
        <Input
          id="faq-title"
          disabled={!canEdit}
          value={textValue(props.title)}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={`faq-q-${idx}`}>Question {idx + 1}</Label>
              <button
                type="button"
                disabled={!canEdit}
                className="inline-flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                aria-label="Remove question"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <Input
              id={`faq-q-${idx}`}
              disabled={!canEdit}
              value={item.question}
              placeholder="What are your school fees?"
              onChange={(e) =>
                updateItems(
                  items.map((it, i) => (i === idx ? { ...it, question: e.target.value } : it)),
                )
              }
            />
            <Textarea
              disabled={!canEdit}
              rows={2}
              value={item.answer}
              placeholder="Answer…"
              onChange={(e) =>
                updateItems(
                  items.map((it, i) => (i === idx ? { ...it, answer: e.target.value } : it)),
                )
              }
            />
          </div>
        ))}
      </div>
      {canEdit && items.length < 15 ? (
        <button
          type="button"
          onClick={() => updateItems([...items, { question: '', answer: '' }])}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:border-brand-300"
        >
          <Plus className="size-3.5" aria-hidden /> Add question
        </button>
      ) : null}
    </>
  );
}

export function WebsiteEditorSkeleton() {
  return <Skeleton className="h-96 w-full rounded-2xl" />;
}
