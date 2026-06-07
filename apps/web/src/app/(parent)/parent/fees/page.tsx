'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@loomis/ui-web';
import { CreditCard, Wallet, Banknote } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';

const MOCK_FEES = [
  { item: 'Tuition', amount: 150000, paid: 100000 },
  { item: 'Development Levy', amount: 25000, paid: 25000 },
  { item: 'Uniform', amount: 15000, paid: 0 },
  { item: 'PTA Levy', amount: 5000, paid: 5000 },
];

const total = MOCK_FEES.reduce((s, f) => s + f.amount, 0);
const paid = MOCK_FEES.reduce((s, f) => s + f.paid, 0);
const outstanding = total - paid;

export default function FeesPage() {
  return (
    <>
      <PageHeader
        title="Fee Status"
        description="Track and pay school fees online — US-PAR-004"
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Charged</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold">₦{total.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold text-success">₦{paid.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold text-destructive">₦{outstanding.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="size-5 text-brand-600" /> Fee Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {MOCK_FEES.map((fee) => (
                  <div key={fee.item} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{fee.item}</p>
                      {fee.paid < fee.amount ? (
                        <p className="text-xs text-destructive">Outstanding: ₦{(fee.amount - fee.paid).toLocaleString()}</p>
                      ) : (
                        <p className="text-xs text-success">Fully paid</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">₦{fee.amount.toLocaleString()}</p>
                      <Badge variant={fee.paid >= fee.amount ? 'success' : 'warning'}>{fee.paid >= fee.amount ? 'Paid' : 'Partial'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-5 text-brand-600" /> Pay Online</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium mb-3">Select payment method</p>
                <div className="space-y-2">
                  <button className="w-full rounded-md border border-border px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-3">
                    <Wallet className="size-5 text-muted-foreground" />
                    <div><p className="font-medium">Pay with Card</p><p className="text-xs text-muted-foreground">Visa, Mastercard, Verve</p></div>
                  </button>
                  <button className="w-full rounded-md border border-border px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-3">
                    <Banknote className="size-5 text-muted-foreground" />
                    <div><p className="font-medium">Bank Transfer</p><p className="text-xs text-muted-foreground">Generate account number for transfer</p></div>
                  </button>
                </div>
              </div>
              <Button className="w-full" size="lg" disabled>
                Pay ₦{outstanding.toLocaleString()} Now
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Payment gateway integration pending. Contact school for offline payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
