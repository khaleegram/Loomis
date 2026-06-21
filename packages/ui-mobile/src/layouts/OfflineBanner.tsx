import { Text, View } from 'react-native';
import { cn } from '../utils/cn.js';

export interface OfflineBannerProps {
  pendingCount: number;
  lastSyncLabel?: string;
  syncing?: boolean;
}

export function OfflineBanner({ pendingCount, lastSyncLabel, syncing }: OfflineBannerProps) {
  if (pendingCount <= 0 && !syncing) return null;

  return (
    <View
      className={cn(
        'flex-row items-center justify-between px-4 py-2.5',
        syncing ? 'bg-brand-500' : 'bg-gold-500',
      )}
    >
      <Text className="text-xs font-bold text-neutral-900">
        {syncing
          ? 'Syncing offline changes…'
          : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`}
      </Text>
      {lastSyncLabel ? (
        <Text className="text-[10px] text-neutral-800/80">{lastSyncLabel}</Text>
      ) : null}
    </View>
  );
}
