import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Legacy route — staff profile lives at /school/staff/[id]. */
export default async function StaffAssignmentsRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/school/staff/${id}`);
}
