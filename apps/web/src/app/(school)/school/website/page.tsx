'use client';

import {
  usePublishWebsite,
  useUnpublishWebsite,
  useUpdateWebsiteSite,
  useWebsiteSite,
} from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  WebsiteEditorSkeleton,
  WebsiteSectionEditor,
} from '@/components/website/website-section-editor';
import { WebsiteHero } from '@/components/website/website-hero';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { schoolPublicSiteUrl } from '@/lib/website/public-site-url';
import type { WebsiteSection, WebsiteSiteResponse } from '@loomis/contracts';

export default function SchoolWebsitePage() {
  const tenantId = useTenantId() ?? '';
  const canEdit = useCanAny(['website.edit']);
  const canPublish = useCan('website.publish');
  const { data: site, isLoading, error } = useWebsiteSite(tenantId);
  const updateMutation = useUpdateWebsiteSite(tenantId);
  const publishMutation = usePublishWebsite(tenantId);
  const unpublishMutation = useUnpublishWebsite(tenantId);

  const [draft, setDraft] = useState<WebsiteSiteResponse | null>(null);

  useEffect(() => {
    if (site) setDraft(site);
  }, [site]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    await updateMutation.mutateAsync({
      slug: draft.slug,
      templateId: draft.templateId,
      theme: draft.theme,
      sections: draft.sections,
      seo: draft.seo,
    });
  }, [draft, updateMutation]);

  if (!tenantId) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <p className="text-sm text-muted-foreground">No school context.</p>
      </PageBody>
    );
  }

  if (isLoading || !draft) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <WebsiteEditorSkeleton />
      </PageBody>
    );
  }

  if (error) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <Alert variant="destructive">
          <AlertDescription>Could not load your website. Try again shortly.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  const publicUrl = schoolPublicSiteUrl(draft.slug);

  return (
    <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
      <WebsiteHero
        site={draft}
        canPublish={canPublish}
        actions={
          <>
            {draft.status === 'published' ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACADEMIC_UI.btnSecondary} inline-flex min-h-[44px] items-center gap-2`}
              >
                View live site
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
            {canPublish ? (
              draft.status === 'published' ? (
                <button
                  type="button"
                  className={ACADEMIC_UI.btnSecondary}
                  disabled={unpublishMutation.isPending}
                  onClick={() => unpublishMutation.mutate(undefined)}
                >
                  {unpublishMutation.isPending ? 'Unpublishing…' : 'Unpublish'}
                </button>
              ) : (
                <button
                  type="button"
                  className={ACADEMIC_UI.btnPrimary}
                  disabled={publishMutation.isPending || updateMutation.isPending}
                  onClick={async () => {
                    if (updateMutation.isPending) return;
                    await handleSave();
                    publishMutation.mutate(undefined);
                  }}
                >
                  {publishMutation.isPending ? 'Publishing…' : 'Publish website'}
                </button>
              )
            ) : null}
          </>
        }
      />

      {(publishMutation.error || unpublishMutation.error || updateMutation.error) && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Something went wrong saving or publishing. Check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      <WebsiteSectionEditor
        tenantId={tenantId}
        site={draft}
        canEdit={canEdit}
        onChange={(sections: WebsiteSection[]) => setDraft({ ...draft, sections })}
        onSlugChange={(slug) => setDraft({ ...draft, slug })}
        onTemplateChange={(templateId) => setDraft({ ...draft, templateId })}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </PageBody>
  );
}
