export function buildReportCardParentMessage(input: {
  termName?: string | null;
  classLabel?: string | null;
  studentName?: string | null;
}): { subject: string; body: string } {
  const term = input.termName?.trim() || 'this term';
  const classLabel = input.classLabel?.trim() || 'your class';

  if (input.studentName) {
    return {
      subject: `Term results — ${term}`,
      body: `Results for ${input.studentName} (${classLabel}) are now available. Sign in to the parent portal to view the full report card.`,
    };
  }

  return {
    subject: `Term results — ${term}`,
    body: `Results for ${classLabel} are now available. Sign in to the parent portal to view your child's report card.`,
  };
}

const CLASS_MESSAGE_STUDENT_BATCH = 50;

export function chunkStudentIdsForClassMessage(studentIds: string[]): string[][] {
  if (studentIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < studentIds.length; i += CLASS_MESSAGE_STUDENT_BATCH) {
    chunks.push(studentIds.slice(i, i + CLASS_MESSAGE_STUDENT_BATCH));
  }
  return chunks;
}
