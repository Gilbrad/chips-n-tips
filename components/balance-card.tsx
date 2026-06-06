import { WalletCards } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface BalanceCardProps {
  balance: number
  currency: string
  monthExpense: number
  monthIncome: number
}

export default function BalanceCard({
  balance,
  currency,
  monthExpense,
  monthIncome,
}: BalanceCardProps) {
  return (
    <section className="rounded-lg border border-primary/20 bg-primary p-5 text-primary-foreground shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary-foreground/80">
            Total balance
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-primary-foreground/15 p-2">
          <WalletCards size={22} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary-foreground/20 pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">
            Income
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatCurrency(monthIncome, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">
            Expenses
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatCurrency(monthExpense, currency)}
          </p>
        </div>
      </div>
    </section>
  )
}
