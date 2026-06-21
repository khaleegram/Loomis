import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  ActionGrid,
  CompactHero,
  MobileScreenShell,
  StatChipRow,
  type ActionGridItem,
  type StatChip,
} from './MobileScreenShell.js';
import { SectionLabel } from '../primitives/Label.js';
import { Skeleton } from '../primitives/Skeleton.js';
import { EmptyState } from '../primitives/EmptyState.js';

export interface HomeHubProps {
  consoleLabel: string;
  userName?: string;
  description?: string;
  statChips: StatChip[];
  actions: ActionGridItem[];
  preview?: ReactNode;
  previewTitle?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  offlineBanner?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function HomeHub({
  consoleLabel,
  userName,
  description,
  statChips,
  actions,
  preview,
  previewTitle = 'Recent',
  loading,
  emptyTitle,
  emptyDescription,
  offlineBanner,
  refreshing,
  onRefresh,
}: HomeHubProps) {
  return (
    <MobileScreenShell
      offlineBanner={offlineBanner}
      {...(refreshing !== undefined ? { refreshing } : {})}
      {...(onRefresh ? { onRefresh } : {})}
    >
      <CompactHero
        consoleLabel={consoleLabel}
        {...(userName ? { userName } : {})}
        {...(description ? { description } : {})}
      />
      {loading ? (
        <View className="gap-3 px-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      ) : (
        <>
          <StatChipRow chips={statChips} />
          {actions.length > 0 ? (
            <View className="mt-2">
              <ActionGrid items={actions} />
            </View>
          ) : null}
      {preview ? (
        <View className="mt-6 px-5">
          <SectionLabel className="mb-3">{previewTitle}</SectionLabel>
          {preview}
        </View>
      ) : emptyTitle ? (
            <EmptyState
              title={emptyTitle}
              {...(emptyDescription ? { description: emptyDescription } : {})}
            />
          ) : null}
        </>
      )}
    </MobileScreenShell>
  );
}
