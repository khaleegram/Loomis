import { redirect } from 'next/navigation';

/** Legacy invite URL — staff are added with provisioned passwords now. */
export default function LegacyInviteStaffPage() {
  redirect('/school/staff/add');
}
