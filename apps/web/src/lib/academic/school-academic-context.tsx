'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import type { Capability } from '@loomis/core';
import { can, effectiveCan } from '@loomis/core';

import { useAuth } from '@/lib/auth/auth-context';
import { useAuthQueryEnabled } from '@/lib/auth/use-auth-query-enabled';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

import { pickActiveYear, pickOpenTerm, sortYearsDesc } from './academic-session-utils';

const HISTORICAL_CAPABILITIES: Capability[] = [
  'fee.configure',
  'payment.verify',
  'payment.log',
  'ledger.view',
];

interface TermOverride {
  yearId: string;
  termId: string;
}

interface SchoolAcademicContextValue {
  yearsQuery: ReturnType<typeof useAcademicYears>;
  termsQuery: ReturnType<typeof useAcademicTerms>;
  sortedYears: AcademicYearResponse[];
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  yearId: string | null;
  termId: string | null;
  activeYear: AcademicYearResponse | null;
  activeTerm: AcademicTermResponse | null;
  openTerm: AcademicTermResponse | null;
  isHistoricalView: boolean;
  canSwitchTerm: boolean;
  isLoading: boolean;
  hasWorkingTerm: boolean;
  setHistoricalTerm: (yearId: string, termId: string) => void;
  resetToOpenTerm: () => void;
}

const SchoolAcademicContext = createContext<SchoolAcademicContextValue | null>(null);

export function SchoolAcademicProvider({ children }: { children: ReactNode }) {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const queriesEnabled = useAuthQueryEnabled();
  const { financeMode } = useTenantExperience();
  const canSwitchTerm = Boolean(
    session &&
      HISTORICAL_CAPABILITIES.some((cap) => effectiveCan(session.role, cap, financeMode)),
  );

  const scopedTenantId = queriesEnabled && tenantId ? tenantId : '';
  const pathname = usePathname();
  const dashboardLive = pathname?.endsWith('/dashboard') ? { live: true as const } : undefined;
  const yearsQuery = useAcademicYears(scopedTenantId, dashboardLive);
  const years = yearsQuery.data?.academicYears ?? [];
  const sortedYears = useMemo(() => sortYearsDesc(years), [years]);

  const systemYear = useMemo(() => pickActiveYear(years), [years]);

  const [override, setOverride] = useState<TermOverride | null>(null);

  const overrideYearId = override?.yearId ?? systemYear?.id ?? null;
  const termsQuery = useAcademicTerms(scopedTenantId, overrideYearId ?? '', dashboardLive);
  const overrideYearTerms = termsQuery.data?.terms ?? [];

  const systemTermsQuery = useAcademicTerms(scopedTenantId, systemYear?.id ?? '', dashboardLive);
  const systemTerms = systemTermsQuery.data?.terms ?? [];
  const openTerm = useMemo(() => pickOpenTerm(systemTerms), [systemTerms]);

  // Reset finance override when the system's open term changes.
  useEffect(() => {
    setOverride(null);
  }, [openTerm?.id]);

  const resolved = useMemo(() => {
    if (override && canSwitchTerm) {
      const year = years.find((y) => y.id === override.yearId) ?? systemYear;
      const terms = override.yearId === systemYear?.id ? systemTerms : overrideYearTerms;
      const term = terms.find((t) => t.id === override.termId) ?? null;
      return { yearId: override.yearId, termId: override.termId, activeYear: year ?? null, activeTerm: term };
    }

    return {
      yearId: systemYear?.id ?? null,
      termId: openTerm?.id ?? null,
      activeYear: systemYear,
      activeTerm: openTerm,
    };
  }, [
    override,
    canSwitchTerm,
    years,
    systemYear,
    systemTerms,
    overrideYearTerms,
    openTerm,
  ]);

  const isHistoricalView = Boolean(
    canSwitchTerm &&
      override &&
      (override.termId !== openTerm?.id || override.yearId !== systemYear?.id),
  );

  const setHistoricalTerm = useCallback(
    (yearId: string, termId: string) => {
      if (!canSwitchTerm) return;
      setOverride({ yearId, termId });
    },
    [canSwitchTerm],
  );

  const resetToOpenTerm = useCallback(() => {
    setOverride(null);
  }, []);

  const isLoading =
    !tenantId ||
    !session ||
    yearsQuery.isLoading ||
    systemTermsQuery.isLoading ||
    (override?.yearId && override.yearId !== systemYear?.id ? termsQuery.isLoading : false);

  const value: SchoolAcademicContextValue = {
    yearsQuery,
    termsQuery: override?.yearId && override.yearId !== systemYear?.id ? termsQuery : systemTermsQuery,
    sortedYears,
    years,
    terms:
      override?.yearId && override.yearId !== systemYear?.id && canSwitchTerm
        ? overrideYearTerms
        : systemTerms,
    yearId: resolved.yearId,
    termId: resolved.termId,
    activeYear: resolved.activeYear,
    activeTerm: resolved.activeTerm,
    openTerm,
    isHistoricalView,
    canSwitchTerm,
    isLoading,
    hasWorkingTerm: Boolean(resolved.termId),
    setHistoricalTerm,
    resetToOpenTerm,
  };

  return <SchoolAcademicContext.Provider value={value}>{children}</SchoolAcademicContext.Provider>;
}

export function useSchoolAcademic(): SchoolAcademicContextValue {
  const ctx = useContext(SchoolAcademicContext);
  if (!ctx) {
    throw new Error('useSchoolAcademic must be used within SchoolAcademicProvider');
  }
  return ctx;
}

/** Safe accessor for components that may render outside school shell. */
export function useSchoolAcademicOptional(): SchoolAcademicContextValue | null {
  return useContext(SchoolAcademicContext);
}

export function canViewHistoricalTerms(role: string | null | undefined): boolean {
  if (!role) return false;
  return HISTORICAL_CAPABILITIES.some((cap) => can(role as Parameters<typeof can>[0], cap));
}
