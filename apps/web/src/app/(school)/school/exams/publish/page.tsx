'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Legacy route — publish is a tab on /school/exams. */
export default function PublishResultsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/school/exams?section=publish');
  }, [router]);

  return null;
}
