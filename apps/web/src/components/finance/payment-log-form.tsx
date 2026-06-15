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
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import {
  SmartFormSection,
  FormSubmitError,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
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
      <div className={`${ACADEMIC_UI.dataPanel} lg:col-span-5`}>
        <div className="border-b border-brand-50 bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
          <p className="text-[14px] font-bold text-neutral-900">Find student</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">Search by name or admission number.</p>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Input
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={smartInputClass}
          />
          {isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {filteredStudents.map((student) => {
              const invoice = invoiceByStudent.get(student.id);
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                    onClick={() => selectStudentInvoice(student.id)}
                    disabled={!invoice}
                  >
                    <span>
                      {student.firstName} {student.lastName}
                      <span className="ml-2 text-xs text-neutral-500">{student.admissionNo}</span>
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
        </div>
      </div>

      <div className={`${ACADEMIC_UI.dataPanel} lg:col-span-7`}>
        <div className="border-b border-brand-50 bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
          <p className="text-[14px] font-bold text-neutral-900">Log offline payment</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            Provisional receipt issued — verification by another staff member required.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {selectedInvoice ? (
                <div className="rounded-xl border border-brand-200/60 bg-brand-50/30 p-4 text-[13px]">
                  <p className="font-bold text-neutral-900">
                    Student {formatStudentRef(selectedInvoice.studentId)}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    Charged {formatKobo(selectedInvoice.amountChargedMinor)} · Paid{' '}
                    {formatKobo(selectedInvoice.amountPaidMinor)} · Balance{' '}
                    <span className="font-mono font-extrabold text-neutral-900">
                      {formatKobo(selectedInvoice.balanceMinor)}
                    </span>
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>Select a student with an outstanding invoice.</AlertDescription>
                </Alert>
              )}

              <SmartFormSection title="Amount received">
                <FormField
                  control={form.control}
                  name="amountMinor"
                  render={({ field }) => (
                    <FormItem>
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
              </SmartFormSection>

              <div className="grid gap-4 sm:grid-cols-2">
                <SmartFormSection title="Payment method">
                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={smartInputClass}>
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
                </SmartFormSection>
                <SmartFormSection title="Payment date">
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="date" className={smartInputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SmartFormSection>
              </div>

              <SmartFormSection title="Reference" description="Bank ref, teller no., etc.">
                <FormField
                  control={form.control}
                  name="channelReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Optional" className={smartInputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SmartFormSection>

              {amountMinor > 0 ? (
                <JournalVoucherCard
                  voucherLabel="Provisional settlement preview"
                  legs={buildPaymentSettlementLegs(amountMinor)}
                />
              ) : null}

              <FormSubmitError message={form.formState.errors.root?.message ?? null} />

              {lastReceiptId ? (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center gap-2">
                    Payment logged · <PaymentStatusChip status="pending_verification" />
                    <span className="text-xs">Receipt ···{lastReceiptId.slice(-8)}</span>
                  </AlertDescription>
                </Alert>
              ) : null}

              <button
                type="submit"
                disabled={!selectedInvoice || logPayment.isSubmitting}
                className={`${ACADEMIC_UI.btnPrimary} w-full sm:w-auto`}
              >
                {logPayment.isSubmitting ? 'Logging…' : 'Log payment'}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
