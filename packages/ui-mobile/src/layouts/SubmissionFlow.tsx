import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { EmptyState } from '../primitives/EmptyState.js';
import { SectionLabel } from '../primitives/Label.js';
import { Skeleton } from '../primitives/Skeleton.js';
import { MOBILE_THEME } from '../theme.js';
import { cn } from '../utils/cn.js';

export interface SubmissionItem {
  id: string;
  title: string;
  dueLabel: string;
  statusLabel: string;
  submitted?: boolean;
}

export interface SubmissionFlowProps {
  title?: string;
  items: SubmissionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSubmit: (id: string) => void;
  loading?: boolean;
  submitting?: boolean;
  progress?: number | null;
  error?: ReactNode;
  emptyTitle?: string;
}

export function SubmissionFlow({
  title = 'Assignments',
  items,
  selectedId,
  onSelect,
  onSubmit,
  loading,
  submitting,
  progress,
  error,
  emptyTitle = 'No assignments',
}: SubmissionFlowProps) {
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="px-5 pt-4">
        <Text className={MOBILE_THEME.pageTitle}>{title}</Text>
        <EmptyState title={emptyTitle} description="Active assignments will show here." />
      </View>
    );
  }

  return (
    <View className="flex-1 px-5 pt-4">
      <Text className={MOBILE_THEME.pageTitle}>{title}</Text>
      <View className="mt-4 min-h-[200px] flex-1">
        <FlashList
          data={items}
          estimatedItemSize={96}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelect(item.id)}>
              <Card className={cn('mb-3', selectedId === item.id && 'border-brand-400')}>
                <Text className="text-base font-bold text-neutral-900">
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  {item.dueLabel} · {item.statusLabel}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      </View>
      {selected ? (
        <View className="border-t border-brand-100/40 bg-white p-4">
          <SectionLabel>Submit</SectionLabel>
          <Text className="mt-2 text-sm font-semibold text-neutral-800">
            {selected.title}
          </Text>
          {!selected.submitted ? (
            <>
              <Button
                className="mt-4"
                variant="secondary"
                loading={submitting ?? false}
                onPress={() => onSubmit(selected.id)}
              >
                Choose file & submit
              </Button>
              {progress !== null && progress !== undefined ? (
                <View className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <View
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Text className="mt-3 text-sm text-emerald-600">Already submitted</Text>
          )}
        </View>
      ) : null}
      {error ? <View className="mt-3">{error}</View> : null}
    </View>
  );
}
