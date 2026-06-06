import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatCurrency, formatDateLabel } from '@/lib/format'
import type { Category, Transaction } from '@/lib/finance-types'

interface TransactionListProps {
  categories: Category[]
  currency: string
  transactions: Transaction[]
}

export default function TransactionList({
  categories,
  currency,
  transactions,
}: TransactionListProps) {
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  )

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        No transactions yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                transaction.type === 'income'
                  ? 'bg-accent/10'
                  : 'bg-destructive/10'
              }`}
            >
              {transaction.type === 'income' ? (
                <ArrowDownLeft
                  size={20}
                  className="text-accent"
                />
              ) : (
                <ArrowUpRight
                  size={20}
                  className="text-destructive"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {transaction.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {categoryById.get(transaction.categoryId)?.name ?? 'Uncategorized'}
              </p>
            </div>
          </div>
          <div className="ml-3 shrink-0 text-right">
            <p
              className={`font-bold text-sm ${
                transaction.type === 'income'
                  ? 'text-accent'
                  : 'text-destructive'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateLabel(transaction.occurredOn)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
