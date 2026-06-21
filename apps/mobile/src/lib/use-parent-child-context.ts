import { useEffect, useMemo } from 'react';
import { useParentDashboard } from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import { childKey, parseChildKey, useActiveChildStore } from '@/lib/active-child-store';
import { setActiveTenantId } from '@/lib/api-client';

export function useParentChildContext() {
  const dashboardQuery = useParentDashboard();
  const cards = dashboardQuery.data?.cards ?? [];
  const activeChildKey = useActiveChildStore((s) => s.activeChildKey);
  const setActiveChildKey = useActiveChildStore((s) => s.setActiveChildKey);

  const activeCard = useMemo(() => {
    if (activeChildKey) {
      const parsed = parseChildKey(activeChildKey);
      if (parsed) {
        const match = cards.find(
          (c) => c.tenantId === parsed.tenantId && c.studentId === parsed.studentId,
        );
        if (match) return match;
      }
    }
    return cards[0] ?? null;
  }, [activeChildKey, cards]);

  useEffect(() => {
    if (activeCard) {
      setActiveChildKey(childKey(activeCard.tenantId, activeCard.studentId));
      setActiveTenantId(activeCard.tenantId);
    }
  }, [activeCard, setActiveChildKey]);

  const childOptions = cards.map((card: ParentChildCardResponse) => ({
    id: childKey(card.tenantId, card.studentId),
    label: card.studentFirstName,
    subtitle: card.schoolName,
    card,
  }));

  return {
    cards,
    activeCard,
    activeChildKey: activeCard
      ? childKey(activeCard.tenantId, activeCard.studentId)
      : null,
    childOptions,
    setActiveChildKey,
    isLoading: dashboardQuery.isLoading,
    isRefetching: dashboardQuery.isRefetching,
    refetch: dashboardQuery.refetch,
    error: dashboardQuery.error,
  };
}

export function pickOpenTermId(
  terms: { id: string; status: string }[] | undefined | null,
): string | null {
  const list = terms ?? [];
  return (
    list.find((term) => term.status === 'open')?.id ??
    list.find((term) => term.status === 'census_locked')?.id ??
    list[0]?.id ??
    null
  );
}
