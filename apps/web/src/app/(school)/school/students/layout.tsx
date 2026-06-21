import type { ReactNode } from 'react';

import { StudentSectionNav } from '@/components/student/student-section-nav';

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-12">
        <StudentSectionNav />
      </div>
      {children}
    </>
  );
}
