import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Card } from '../primitives/Card.js';
import { CurrencyText } from '../primitives/CurrencyText.js';
import { EmptyState } from '../primitives/EmptyState.js';
import { SectionLabel } from '../primitives/Label.js';
import { Skeleton } from '../primitives/Skeleton.js';
import { Separator } from '../primitives/Separator.js';
import { Alert } from '../primitives/Alert.js';
import { MOBILE_THEME } from '../theme.js';

export interface SummaryRow {
  id: string;
  label: string;
  value: string;
  subValue?: string;
}

export interface SummaryDetailProps {
  title: string;
  summaryLabel: string;
  summaryValue: string;
  summaryMinor?: number;
  rows: SummaryRow[];
  footer?: ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  errorMessage?: string;
}

export function SummaryDetail({
  title,
  summaryLabel,
  summaryValue,
  summaryMinor,
  rows,
  footer,
  loading,
  emptyTitle,
  errorMessage,
}: SummaryDetailProps) {
  if (loading) {
    return (
      <View className="gap-3 px-5 pt-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="px-5 pt-4">
        <Alert tone="danger">{errorMessage}</Alert>
      </View>
    );
  }

  if (rows.length === 0 && emptyTitle) {
    return <EmptyState title={emptyTitle} />;
  }

  return (
    <View className="px-5 pt-4">
      <Text className={MOBILE_THEME.pageTitle}>{title}</Text>
      <Card className="mt-4">
        <SectionLabel>{summaryLabel}</SectionLabel>
        {summaryMinor !== undefined ? (
          <CurrencyText amountMinor={summaryMinor} className="mt-2 text-2xl" />
        ) : (
          <Text className="mt-2 text-2xl font-extrabold text-neutral-900">
            {summaryValue}
          </Text>
        )}
      </Card>
      <Card className="mt-4" padded={false}>
        {rows.map((row, index) => (
          <View key={row.id}>
            {index > 0 ? <Separator className="mx-4" /> : null}
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-neutral-900">
                  {row.label}
                </Text>
                {row.subValue ? (
                  <Text className="text-xs text-neutral-500">{row.subValue}</Text>
                ) : null}
              </View>
              <Text className="text-sm font-bold text-neutral-800">
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      {footer ? <View className="mt-4">{footer}</View> : null}
    </View>
  );
}
