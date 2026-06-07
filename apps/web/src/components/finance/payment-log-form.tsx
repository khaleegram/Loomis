'use client';

import { useInvoices, useLogOfflinePayment, useStudents } from '@loomis/api-client';
import {
  logOfflinePaymentRequest,
  offlinePaymentMethod,
  type InvoiceResponse,
  type OfflinePaymentMethod,
} from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CurrencyInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  JournalVoucherCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import {
  buildPaymentSettlementLegs,
  formatOfflinePaymentMethod,
  formatStudentRef,
} from '@/lib/finance/finance-labels';

const formSchema = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  method: offlinePaymentMethod,
  paymentDate: z.string().min(1),
  channelReference: z.string().max(120).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PaymentLogFormProps {
  tenantId: string;
  termId: string;
}

export function PaymentLogForm({ tenantId, termId }: PaymentLogFormProps) {
  const [search, setSearch] = useState('');
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

  const studentsQuery = useStudents(tenantId, { status: 'enrolled' });
  const invoicesQuery = useInvoices(tenantId, termId);
  const logPayment = useLogOfflinePayment(tenantId, termId);

  const students = studentsQuery.data?.students ?? [];
  const invoices = invoicesQuery.data?.invoices ?? [];

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 20);
    return students
      .filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [students, search]);

  const invoiceByStudent = useMemo(() => {
    const map = new Map<string, InvoiceResponse>();
    for (const inv of invoices) {
      if (inv.status !== 'void' && inv.balanceMinor > 0) {
        map.set(inv.studentId, inv);
      }
    }
    return map;
  }, [invoices]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceId: '',
      amountMinor: 0,
      method: 'cash',
      paymentDate: new Date().toISOString().slice(0, 10),
      channelReference: '',
    },
  });

  const selectedInvoiceId = form.watch('invoiceId');
  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) ?? null;
  const amountMinor = form.watch('amountMinor');

  function selectStudentInvoice(studentId: string) {
    const invoice = invoiceByStudent.get(studentId);
    if (invoice) {
      form.setValue('invoiceId', invoice.id);
      form.setValue('amountMinor', invoice.balanceMinor);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const body = logOfflinePaymentRequest.parse({
        ...values,
        channelReference: values.channelReference || undefined,
      });
      const payment = await logPayment.mutateAsync(body);
      setLastReceiptId(payment.receipt?.id ?? payment.id);
      form.reset({
        invoiceId: '',
        amountMinor: 0,
        method: values.method,
        paymentDate: values.paymentDate,
        channelReference: '',
      });
      logPayment.regenerateIdempotencyKey();
      form.clearErrors('root');
    } catch (error) {
      form.setError('root', { message: financeErrorMessage(error) });
    }
  }

  const isLoading = studentsQuery.isLoading || invoicesQuery.isLoading;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="shadow-card lg:col-span-5">
        <CardHeader>
          <CardTitle>Find student</CardTitle>
          <CardDescription>Search by name or admission number (US-FIN-002).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? <Skeleton className="h-40 w-full" /> : null}
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {filteredStudents.map((student) => {
              const invoice = invoiceByStudent.get(student.id);
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-sm border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    onClick={() => selectStudentInvoice(student.id)}
                    disabled={!invoice}
                  >
                    <span>
                      {student.firstName} {student.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">{student.admissionNo}</span>
                    </span>
                    {invoice ? (
                      <Badge variant="outline">{formatKobo(invoice.balanceMinor)} due</Badge>
                    ) : (
                      <Badge variant="secondary">No balance</Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-card lg:col-span-7">
        <CardHeader>
          <CardTitle>Log offline payment</CardTitle>
          <CardDescription>
            Provisional receipt issued. Verification must be done by another staff member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {selectedInvoice ? (
                <div className="rounded-sm border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Student {formatStudentRef(selectedInvoice.studentId)}
                  </p>
                  <p className="text-muted-foreground">
                    Charged {formatKobo(selectedInvoice.amountChargedMinor)} · Paid{' '}
                    {formatKobo(selectedInvoice.amountPaidMinor)} · Balance{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {formatKobo(selectedInvoice.balanceMinor)}
                    </span>
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>Select a student with an outstanding invoice.</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="amountMinor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount received</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        valueKobo={field.value}
                        onChangeKobo={(kobo) => {
                          const cap = selectedInvoice?.balanceMinor ?? kobo;
                          field.onChange(Math.min(kobo, cap));
                        }}
                        disabled={!selectedInvoice}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment method</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offlinePaymentMethod.options.map((method) => (
                            <SelectItem key={method} value={method}>
                              {formatOfflinePaymentMethod(method as OfflinePaymentMethod)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="channelReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bank ref, teller no., etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {amountMinor > 0 ? (
                <JournalVoucherCard
                  voucherLabel="Provisional settlement preview"
                  legs={buildPaymentSettlementLegs(amountMinor)}
                />
              ) : null}

              {form.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              {lastReceiptId ? (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center gap-2">
                    Payment logged · <PaymentStatusChip status="pending_verification" />
                    <span className="text-xs">Receipt ···{lastReceiptId.slice(-8)}</span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={!selectedInvoice || logPayment.isSubmitting}
                className="w-full sm:w-auto"
              >
                {logPayment.isSubmitting ? 'Logging…' : 'Log payment'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
