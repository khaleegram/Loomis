import { redirect } from 'next/navigation';

export default function LegacyCensusLockRedirect() {
  redirect('/school/finance/platform-fee');
}
