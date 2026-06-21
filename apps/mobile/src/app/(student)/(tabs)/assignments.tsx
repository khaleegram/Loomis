import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { View } from 'react-native';
import {
  useAcademicTerms,
  useAcademicYears,
  useMyAssignments,
  useSubmitAssignment,
} from '@loomis/api-client';
import { Alert, SubmissionFlow } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

export default function StudentAssignmentsScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const assignmentsQuery = useMyAssignments(tenantId, termId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const submitAssignment = useSubmitAssignment(tenantId);

  const assignments = assignmentsQuery.data?.assignments ?? [];

  async function handleUpload(assignmentId: string) {
    setSelectedId(assignmentId);
    setUploadError(null);
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    try {
      await submitAssignment.mutateAsync({
        assignmentId,
        content: `Submitted: ${asset.name}`,
      });
    } catch {
      setUploadError('Upload failed. File storage may require S3 credentials.');
    }
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-forest-950">
      <SubmissionFlow
        items={assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          dueLabel: `Due ${new Date(assignment.dueAt).toLocaleDateString()}`,
          statusLabel: assignment.mySubmission ? 'Submitted' : 'Not submitted',
          submitted: Boolean(assignment.mySubmission),
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onSubmit={(id) => void handleUpload(id)}
        loading={assignmentsQuery.isLoading}
        submitting={submitAssignment.isPending}
        progress={submitAssignment.isPending ? 60 : null}
        error={
          uploadError ? (
            <Alert tone="warning">{uploadError}</Alert>
          ) : null
        }
      />
    </View>
  );
}
