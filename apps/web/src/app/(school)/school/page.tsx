'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth/auth-context';
import { isExamOfficerRole } from '@/lib/auth/is-exam-officer';

export default function SchoolIndexPage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session?.role && isExamOfficerRole(session.role)) {
      router.replace('/school/exams');
      return;
    }
    router.replace('/school/dashboard');
  }, [session?.role, router]);

  return null;
}
