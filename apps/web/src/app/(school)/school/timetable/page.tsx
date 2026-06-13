'use client';



import {

  useCreateTimetableEntry,

  useDeleteTimetableEntry,

  useMyTimetable,

  useTimetable,

  useTimetableSubjectOptions,

  useTimetableSummary,

} from '@loomis/api-client';

import { Alert, AlertDescription } from '@loomis/ui-web';

import { Send } from 'lucide-react';

import Link from 'next/link';

import { useMemo, useState } from 'react';



import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';

import {

  TimetableAssignLessonSheet,

  type TimetableSlotTarget,

} from '@/components/academic/ops/timetable-add-period-sheet';

import { TimetableCommandCenter } from '@/components/academic/ops/timetable-command-center';

import { TimetableHero } from '@/components/academic/ops/timetable-hero';

import { TimetableScheduleCanvas } from '@/components/academic/ops/timetable-schedule-canvas';

import { TimetableWeekGrid } from '@/components/academic/ops/timetable-week-grid';

import { PageBody } from '@/components/school/school-shell';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

import { academicErrorMessage } from '@/lib/academic/academic-errors';

import {

  classArmOptions,

  useAcademicOpsContext,

} from '@/lib/academic/use-academic-ops-context';

import { useCan, useCanAny } from '@/lib/auth/use-capability';

import { useTenantId } from '@/lib/tenant/use-tenant-id';

import { useBellScheduleSlots } from '@/lib/timetable/use-bell-schedule-slots';



export default function TimetablePage() {

  const tenantId = useTenantId();

  const canManage = useCan('timetable.manage');

  const canView = useCanAny(['timetable.manage', 'timetable.view']);

  const isStaffViewer = canView && !canManage;

  const [assignSlot, setAssignSlot] = useState<TimetableSlotTarget | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);



  const ctx = useAcademicOpsContext(tenantId ?? '');

  const filters =

    ctx.termId && ctx.classArmId

      ? { termId: ctx.termId, classArmId: ctx.classArmId }

      : null;



  const { scheduleSlots } = useBellScheduleSlots(tenantId, ctx.yearId);



  const timetableQuery = useTimetable(tenantId ?? '', !isStaffViewer ? filters : null);

  const myTimetableQuery = useMyTimetable(tenantId ?? '', isStaffViewer ? ctx.termId : null);

  const summaryQuery = useTimetableSummary(tenantId ?? '', canManage ? ctx.termId : null);

  const subjectOptionsQuery = useTimetableSubjectOptions(tenantId ?? '', canManage ? filters : null);



  const createEntry = useCreateTimetableEntry(tenantId ?? '');

  const deleteEntry = useDeleteTimetableEntry(tenantId ?? '');



  const entries = isStaffViewer
    ? (myTimetableQuery.data?.entries ?? [])
    : (timetableQuery.data?.entries ?? []);

  const timetableLoading = isStaffViewer
    ? myTimetableQuery.isLoading && Boolean(ctx.termId)
    : timetableQuery.isLoading && Boolean(filters);

  const subjectOptions = subjectOptionsQuery.data?.options ?? [];

  const summary = summaryQuery.data;



  const draftCount = useMemo(

    () => entries.filter((entry) => entry.status === 'draft').length,

    [entries],

  );



  const canEdit = canManage && ctx.activeTerm?.status === 'open';

  const classLabel =

    classArmOptions(ctx.arms, ctx.levels).find((arm) => arm.id === ctx.classArmId)?.label ?? null;

  const termLabel = ctx.activeTerm?.name ?? null;



  const publishHref = ctx.termId

    ? `/school/timetable/publish?termId=${encodeURIComponent(ctx.termId)}`

    : '/school/timetable/publish';



  const termDraftCount = summary?.totalDraftSlots ?? 0;



  const heroActions = canEdit ? (
    <Link href={publishHref} className={ACADEMIC_UI.btnPrimary}>
      <Send aria-hidden className="size-4" />
      Review & publish
      {termDraftCount > 0 ? ` (${termDraftCount})` : ''}
    </Link>
  ) : null;



  function openAssignSheet(slot: TimetableSlotTarget) {

    setAssignSlot(slot);

    setSheetOpen(true);

  }



  const deleteHandler = canEdit

    ? async (entryId: string) => {

        setActionError(null);

        try {

          await deleteEntry.mutateAsync({ entryId });

        } catch (err) {

          setActionError(academicErrorMessage(err));

        }

      }

    : undefined;



  if (!tenantId) {

    return (

      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">

        <Alert variant="destructive">

          <AlertDescription>No tenant context. Sign in again.</AlertDescription>

        </Alert>

      </PageBody>

    );

  }



  if (!canView) {

    return (

      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">

        <Alert>

          <AlertDescription>You do not have permission to view the timetable.</AlertDescription>

        </Alert>

      </PageBody>

    );

  }



  return (

    <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">

      <div className="space-y-6">

        {canManage ? (

          <TimetableCommandCenter

            years={ctx.sortedYears}

            terms={ctx.terms}

            yearId={ctx.yearId}

            termId={ctx.termId}

            classArmId={ctx.classArmId}

            classLabel={classLabel}

            onYearChange={(id) => {

              ctx.setYearId(id);

              ctx.setTermId(null);

            }}

            onTermChange={ctx.setTermId}

            onSelectClassArm={ctx.setClassArmId}

            summary={summary ?? null}

            summaryLoading={summaryQuery.isLoading}

            selectedLessonCount={entries.length}

            selectedDraftCount={draftCount}

            publishHref={publishHref}

            actions={heroActions}

          />

        ) : (

          <>

            <TimetableHero

              canManage={false}

              viewerMode={isStaffViewer ? 'personal' : 'class'}

              classLabel={classLabel}

              termLabel={termLabel}

              lessonCount={entries.length}

              isLoading={timetableLoading}

            />

            <AcademicScopePicker

              years={ctx.sortedYears}

              terms={ctx.terms}

              classArmOptions={classArmOptions(ctx.arms, ctx.levels)}

              yearId={ctx.yearId}

              termId={ctx.termId}

              classArmId={ctx.classArmId}

              hideClassSelection={isStaffViewer}

              onYearChange={(id) => {

                ctx.setYearId(id);

                ctx.setTermId(null);

              }}

              onTermChange={ctx.setTermId}

              onClassArmChange={ctx.setClassArmId}

            />

          </>

        )}



        {actionError ? (

          <Alert variant="destructive">

            <AlertDescription>{actionError}</AlertDescription>

          </Alert>

        ) : null}



        {canManage ? (

          <TimetableScheduleCanvas

            classLabel={classLabel}

            termLabel={termLabel}

            entries={entries}

            scheduleSlots={scheduleSlots}

            isLoading={timetableQuery.isLoading && Boolean(filters)}

            showStatus

            canEdit={canEdit}

            onDeleteEntry={deleteHandler}

            onEmptySlotClick={canEdit ? openAssignSheet : undefined}

            emptyMessage="Tap + on any empty cell to assign a subject."

          />

        ) : isStaffViewer ? (

          !ctx.termId ? (

            <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>

              <p className="text-[13px] text-neutral-500">Select an academic year and term to view your schedule.</p>

            </div>

          ) : myTimetableQuery.isError ? (

            <Alert>

              <AlertDescription>

                Could not load your schedule. If timetables have not been published for this term yet, check back

                after the timetable officer publishes.

              </AlertDescription>

            </Alert>

          ) : (

            <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>

              <TimetableWeekGrid

                entries={entries}

                scheduleSlots={scheduleSlots}

                isLoading={timetableLoading}

                showTermStructure

                showClassLabel

                emptyMessage="No published lessons assigned to you for this term yet."

              />

            </div>

          )

        ) : !filters ? (

          <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>

            <p className="text-[13px] text-neutral-500">Select year, term, and class to view the timetable.</p>

          </div>

        ) : (

          <div className={`${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>

            <TimetableWeekGrid

              entries={entries}

              scheduleSlots={scheduleSlots}

              isLoading={timetableQuery.isLoading}

              showTermStructure

              emptyMessage="No published timetable for this class yet."

            />

          </div>

        )}

      </div>



      {canEdit && filters ? (

        <TimetableAssignLessonSheet

          open={sheetOpen}

          onOpenChange={setSheetOpen}

          slot={assignSlot}

          classLabel={classLabel}

          options={subjectOptions}

          isSubmitting={createEntry.isPending}

          onSubmit={async (values) => {
            await createEntry.mutateAsync({
              termId: filters.termId,
              classArmId: filters.classArmId,
              ...values,
            });
          }}

        />

      ) : null}

    </PageBody>

  );

}


