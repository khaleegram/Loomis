'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useInviteStaff } from '@loomis/api-client';
import { inviteStaffRequest, staffPrimaryRole, type InviteStaffRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRIMARY_ROLES = staffPrimaryRole.options;

export default function InviteStaffPage() {
  const tenantId = useTenantId();
  const router = useRouter();
  const canOnboard = useCan('staff.onboard');
  const invite = useInviteStaff(tenantId ?? '');

  const form = useForm<InviteStaffRequest>({
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
          <p className="text-sm text-muted-foreground">You do not have permission to invite staff.</p>
        </PageBody>
      </>
    );
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Invite staff" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values);
      router.push('/school/staff');
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to send invitation.',
      });
    }
  });

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
        <Card className="mx-auto max-w-md shadow-card">
          <CardHeader>
            <CardTitle className="text-base">New staff invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {form.formState.errors.root?.message ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                  </Alert>
                ) : null}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIMARY_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {formatRoleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || invite.isPending}
                  className="w-full"
                >
                  {form.formState.isSubmitting || invite.isPending
                    ? 'Sending invitation…'
                    : 'Send invitation'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
