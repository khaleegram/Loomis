'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from '@loomis/ui-web';
import { Shield, Mail, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';

const contactSchema = z.object({
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: 'parent@example.com', phone: '08012345678' },
  });

  return (
    <>
      <PageHeader
        title="Contact & Privacy"
        description="Update your contact details and notification preferences — US-PAR-005"
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="size-5 text-brand-600" /> Contact Details</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled>Save Changes</Button>
                  <p className="text-xs text-muted-foreground">
                    Email changes require MFA verification and a 24-hour cooling-off period. Phone changes require OTP verification.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="size-5 text-brand-600" /> Security & Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium mb-2">Notification Preferences</p>
                <label className="flex items-center gap-2 text-sm py-1">
                  <input type="checkbox" defaultChecked className="rounded" /> Push notifications
                </label>
                <label className="flex items-center gap-2 text-sm py-1">
                  <input type="checkbox" defaultChecked className="rounded" /> Email notifications
                </label>
                <label className="flex items-center gap-2 text-sm py-1">
                  <input type="checkbox" className="rounded" /> SMS alerts
                </label>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground mt-1">1 active session • Lagos, Nigeria</p>
                <Button variant="outline" size="sm" className="mt-2">Manage sessions</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
