import { FlashList } from '@shopify/flash-list';
import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';
import { MOBILE_THEME } from '../theme.js';
import { EmptyState } from '../primitives/EmptyState.js';
import { Skeleton } from '../primitives/Skeleton.js';

export interface TimelineSection {
  id: string;
  title: string;
  items: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  label: string;
  meta?: string;
  status?: 'present' | 'absent' | 'late' | 'neutral';
}

const statusDot: Record<NonNullable<TimelineItem['status']>, string> = {
  present: 'bg-accent-green-500',
  absent: 'bg-red-500',
  late: 'bg-gold-500',
  neutral: 'bg-neutral-300',
};

export interface TimelineListProps {
  sections: TimelineSection[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TimelineList({
  sections,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
}: TimelineListProps) {
  if (loading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </View>
    );
  }

  if (sections.length === 0) {
    return <EmptyState title={emptyTitle} {...(emptyDescription ? { description: emptyDescription } : {})} />;
  }

  return (
    <FlashList
      data={sections}
      estimatedItemSize={80}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      keyExtractor={(section) => section.id}
      renderItem={({ item: section }) => (
        <View className="mb-6">
          <Text className={cn(MOBILE_THEME.sectionLabel, 'mb-3')}>{section.title}</Text>
          {section.items.map((row) => (
            <View
              key={row.id}
              className={cn('mb-2 flex-row items-center px-4 py-3', MOBILE_THEME.dataPanel)}
            >
              <View
                className={cn('mr-3 h-2.5 w-2.5 rounded-full', statusDot[row.status ?? 'neutral'])}
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">
                  {row.label}
                </Text>
                {row.meta ? (
                  <Text className="text-xs text-neutral-500">{row.meta}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    />
  );
}
