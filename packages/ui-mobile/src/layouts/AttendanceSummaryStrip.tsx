import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';

export interface AttendanceSummaryStripProps {
  present: number;
  absent: number;
  late: number;
  excused?: number;
  classArmLabel?: string | null;
  termLabel?: string | null;
}

export function AttendanceSummaryStrip({
  present,
  absent,
  late,
  excused = 0,
  classArmLabel,
  termLabel,
}: AttendanceSummaryStripProps) {
  const total = present + absent + late + excused;
  const rate = total > 0 ? Math.round((present / total) * 100) : null;

  return (
    <View className={cn('mx-5 mt-4 p-4', MOBILE_THEME.dataPanel)}>
      {classArmLabel || termLabel ? (
        <Text className={MOBILE_THEME.sectionLabel}>
          {[classArmLabel, termLabel].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <StatChip label="Present" value={String(present)} tone="green" />
        <StatChip label="Absent" value={String(absent)} tone="red" />
        <StatChip label="Late" value={String(late)} tone="gold" />
        {excused > 0 ? <StatChip label="Excused" value={String(excused)} tone="neutral" /> : null}
        {rate != null ? <StatChip label="Rate" value={`${rate}%`} tone="brand" /> : null}
      </View>
    </View>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'red' | 'gold' | 'neutral' | 'brand';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-accent-green-600'
      : tone === 'red'
        ? 'text-red-600'
        : tone === 'gold'
          ? 'text-gold-600'
          : tone === 'brand'
            ? 'text-brand-700'
            : 'text-neutral-600';

  return (
    <View className="min-w-[72px] rounded-xl bg-neutral-50 px-3 py-2">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</Text>
      <Text className={`text-lg font-extrabold ${toneClass}`}>{value}</Text>
    </View>
  );
}
