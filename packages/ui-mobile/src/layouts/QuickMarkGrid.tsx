import { Pressable, Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';
import { Button } from '../primitives/Button.js';
import { EmptyState } from '../primitives/EmptyState.js';
import { Skeleton } from '../primitives/Skeleton.js';

export type AttendanceMark = 'present' | 'absent' | 'late';

export interface MarkStudent {
  id: string;
  name: string;
  status: AttendanceMark | null;
}

export interface QuickMarkGridProps {
  students: MarkStudent[];
  dateLabel: string;
  loading?: boolean;
  onMark: (studentId: string, status: AttendanceMark) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

const markStyles: Record<AttendanceMark, string> = {
  present: MOBILE_THEME.statusPresent,
  absent: MOBILE_THEME.statusAbsent,
  late: MOBILE_THEME.statusLate,
};

export function QuickMarkGrid({
  students,
  dateLabel,
  loading,
  onMark,
  onSubmit,
  submitting,
}: QuickMarkGridProps) {
  if (loading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </View>
    );
  }

  if (students.length === 0) {
    return <EmptyState title="No students" description="Your class roster will appear here." />;
  }

  const marked = students.filter((s) => s.status !== null).length;

  return (
    <View className="flex-1 px-5 pt-4">
      <Text className={MOBILE_THEME.sectionLabel}>Attendance · {dateLabel}</Text>
      <Text className="mb-4 mt-1 text-sm text-neutral-500">
        {marked} of {students.length} marked
      </Text>
      <View className="flex-1 gap-2">
        {students.map((student) => (
          <View
            key={student.id}
            className="rounded-2xl border border-brand-100/40 bg-white p-3"
          >
            <Text className="mb-2 text-sm font-semibold text-neutral-900">
              {student.name}
            </Text>
            <View className="flex-row gap-2">
              {(['present', 'absent', 'late'] as AttendanceMark[]).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => onMark(student.id, status)}
                  className={cn(
                    'min-h-[44px] flex-1 items-center justify-center rounded-xl',
                    student.status === status
                      ? markStyles[status]
                      : 'bg-neutral-100',
                  )}
                >
                  <Text className="text-xs font-bold capitalize text-neutral-800">
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
      <Button className="mt-4 mb-8" loading={submitting ?? false} onPress={onSubmit}>
        Save attendance
      </Button>
    </View>
  );
}
