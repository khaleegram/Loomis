'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useInviteStaff } from '@loomis/api-client';
import { inviteStaffRequest, staffPrimaryRole, type InviteStaffRequest } from '@loomis/contracts';
import { Button } from '@loomis/ui-web';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { FormError, TextField } from '@/components/auth/auth-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRIMARY_ROLES = staffPrimaryRole.options;

export default function InviteStaffPage() {
  const tenantId = useTenantId();
  const router = useRouter();
  const canOnboard = useCan('staff.onboard');
  const invite = useInviteStaff(tenantId ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<InviteStaffRequest>({
    resolver: zodResolver(inviteStaffRequest),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      primaryRole: 'teacher',
    },
  });

  if (!canOnboard) {
    return (
      <>
        <PageHeader title="Invite staff" />
        <PageBody>
          <p className="text-sm text-neutral-500">You do not have permission to invite staff.</p>
        </PageBody>
      </>
    );
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Invite staff" />
        <PageBody>
          <p className="text-sm text-red-600">No tenant context. Sign in again.</p>
        </PageBody>
      </>
    );
  }

  async function onSubmit(values: InviteStaffRequest) {
    try {
      await invite.mutateAsync(values);
      router.push('/school/staff');
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to send invitation.',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Invite staff"
        description="Create a pending account and send a one-time setup link (US-HRM-001). The link expires after 48 hours."
        actions={
          <Button variant="outline" asChild>
            <Link href="/school/staff">Back to directory</Link>
          </Button>
        }
      />
      <PageBody>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <FormError message={errors.root?.message ?? null} />

          <TextField
            label="Full name"
            autoComplete="name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <div className="mb-4">
            <label htmlFor="primaryRole" className="mb-1 block text-sm font-medium text-neutral-700">
              Primary role
            </label>
            <select
              id="primaryRole"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              {...register('primaryRole')}
            >
              {PRIMARY_ROLES.map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </select>
            {errors.primaryRole?.message ? (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.primaryRole.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting || invite.isPending} className="w-full">
            {isSubmitting || invite.isPending ? 'Sending invitation…' : 'Send invitation'}
          </Button>
        </form>
      </PageBody>
    </>
  );
}
