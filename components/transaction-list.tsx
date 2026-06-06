import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateLabel } from '@/lib/format'
import type { Category, Transaction } from '@/lib/finance-types'

interface TransactionListProps {
  categories: Category[]
  currency: string
  onDelete: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  transactions: Transaction[]
}

export default function TransactionList({
  categories,
  currency,
  onDelete,
  onEdit,
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
          className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60 sm:flex sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            <div
              className={`shrink-0 rounded-lg p-2 ${
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
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {transaction.description}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {categoryById.get(transaction.categoryId)?.name ?? 'Uncategorized'}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border pt-3 sm:ml-3 sm:shrink-0 sm:border-0 sm:pt-0">
            <div className="min-w-0 sm:text-right">
              <p
                className={`break-all text-sm font-bold ${
                  transaction.type === 'income'
                    ? 'text-accent'
                    : 'text-destructive'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount, currency)}
              </p>
              <p className="text-xs text-muted-foreground sm:whitespace-nowrap">
                {formatDateLabel(transaction.occurredOn)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                aria-label={`Edit ${transaction.description}`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onEdit(transaction)}
                title="Edit transaction"
                type="button"
              >
                <Pencil size={16} />
              </button>
              <button
                aria-label={`Delete ${transaction.description}`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(transaction)}
                title="Delete transaction"
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
