import type { ReactNode } from 'react';
import { View } from 'react-native';
import { EmptyState, Skeleton } from '@loomis/ui-mobile';
import { ParentAcademicsContextBar } from '@/components/parent/chrome/parent-academics-context-bar';
import { ParentScreen } from '@/components/parent/chrome/parent-screen';
import { useParentChildContext } from '@/lib/use-parent-child-context';
import { useParentTermScope } from '@/lib/parent/use-parent-term-scope';
import { studentDisplayName } from '@/lib/parent/parent-ui';

interface ParentScopedScreenProps {
  children: (ctx: {
    tenantId: string;
    studentId: string;
    termId: string | null;
    termLabel: string | null;
    termLoading: boolean;
  }) => ReactNode;
}

export function ParentScopedScreen({ children }: ParentScopedScreenProps) {
  const { childOptions, activeChildKey, activeCard, setActiveChildKey, isLoading, cards } =
    useParentChildContext();
  const tenantId = activeCard?.tenantId ?? '';
  const term = useParentTermScope(tenantId);

  const unread = cards.reduce((sum, c) => sum + c.unreadMessageCount, 0);

  const scopedChildOptions = childOptions.map((opt) => ({
    ...opt,
    label: studentDisplayName(opt.card),
    subtitle: opt.card.classArmLabel ?? opt.card.schoolName,
  }));

  if (isLoading) {
    return (
      <ParentScreen islandLabel="Family Portal" unreadCount={unread}>
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </View>
      </ParentScreen>
    );
  }

  if (cards.length === 0) {
    return (
      <ParentScreen islandLabel="Family Portal" unreadCount={unread}>
        <EmptyState
          title="No linked children"
          description="Ask your school administrator to link your parent account to your children."
          className="pt-10"
        />
      </ParentScreen>
    );
  }

  if (!activeCard) return null;

  return (
    <ParentScreen islandLabel={activeCard.schoolName} unreadCount={unread} scroll={false}>
      <View className="flex-1">
        <ParentAcademicsContextBar
          childOptions={scopedChildOptions}
          activeChildKey={activeChildKey}
          onSelectChild={setActiveChildKey}
          activeCard={activeCard}
          terms={term.terms}
          termId={term.termId}
          onSelectTerm={term.setTermId}
        />
        <View className="min-h-0 flex-1">
          {children({
            tenantId: activeCard.tenantId,
            studentId: activeCard.studentId,
            termId: term.termId,
            termLabel: term.termLabel,
            termLoading: term.isLoading,
          })}
        </View>
      </View>
    </ParentScreen>
  );
}
