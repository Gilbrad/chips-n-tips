'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { CalendarClock, ReceiptText, TrendingDown } from 'lucide-react'
import ActionButtons from '@/components/action-buttons'
import BalanceCard from '@/components/balance-card'
import type { SpendingChartPoint } from '@/components/spending-chart'
import StatsCard from '@/components/stats-card'
import TransactionList from '@/components/transaction-list'
import TransactionModal from '@/components/transaction-modal'
import { useFinance } from '@/components/finance-provider'
import { toDateInputValue } from '@/lib/dates'
import { formatCurrency } from '@/lib/format'
import type { Transaction, TransactionType } from '@/lib/finance-types'

const SpendingChart = dynamic(() => import('@/components/spending-chart'), {
  loading: () => <div className="h-64 w-full rounded-lg bg-muted/40" />,
  ssr: false,
})

function getRecentChartData(transactions: Transaction[]): SpendingChartPoint[] {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const iso = toDateInputValue(date)
    const label = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
    }).format(date)

    return transactions
      .filter((transaction) => transaction.occurredOn === iso)
      .reduce<SpendingChartPoint>(
        (point, transaction) => {
          if (transaction.type === 'expense') {
            point.expense += transaction.amount
          } else {
            point.income += transaction.amount
          }

          return point
        },
        { expense: 0, income: 0, label },
      )
  })
}

export default function Dashboard() {
  const {
    addTransaction,
    categories,
    currency,
    isLoading,
    paymentDates,
    transactions,
  } = useFinance()
  const [modalType, setModalType] = useState<TransactionType | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  )
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories],
  )

  const balance = useMemo(
    () =>
      transactions.reduce((total, transaction) => {
        return transaction.type === 'income'
          ? total + transaction.amount
          : total - transaction.amount
      }, 0),
    [transactions],
  )

  const today = toDateInputValue()
  const monthPrefix = today.slice(0, 7)

  const monthExpense = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.occurredOn.startsWith(monthPrefix),
        )
        .reduce((total, transaction) => total + transaction.amount, 0),
    [monthPrefix, transactions],
  )

  const monthIncome = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === 'income' &&
            transaction.occurredOn.startsWith(monthPrefix),
        )
        .reduce((total, transaction) => total + transaction.amount, 0),
    [monthPrefix, transactions],
  )

  const dailyAverage = useMemo(() => {
    const dayOfMonth = Number(today.slice(-2))
    return monthExpense / Math.max(dayOfMonth, 1)
  }, [monthExpense, today])

  const upcomingPayment = useMemo(
    () =>
      paymentDates
        .filter((paymentDate) => !paymentDate.paidAt && paymentDate.dueOn >= today)
        .sort((first, second) => first.dueOn.localeCompare(second.dueOn))[0],
    [paymentDates, today],
  )

  const chartData = useMemo(
    () => getRecentChartData(transactions),
    [transactions],
  )

  const handleModalSubmit = async (input: {
    amount: number
    categoryId: string
    description: string
    occurredOn: string
  }) => {
    if (!modalType) {
      return
    }

    await addTransaction({
      ...input,
      type: modalType,
    })
    setModalType(null)
  }

  const modalCategories = modalType === 'income' ? incomeCategories : expenseCategories

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Offline ledger
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Chips n&apos; Tips
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-accent" />
          IndexedDB ready
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <BalanceCard
          balance={balance}
          currency={currency}
          monthExpense={monthExpense}
          monthIncome={monthIncome}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatsCard
            description="Current month"
            icon={TrendingDown}
            label="Daily average"
            value={formatCurrency(dailyAverage, currency)}
          />
          <StatsCard
            description={
              upcomingPayment
                ? new Intl.DateTimeFormat('en-US', {
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(`${upcomingPayment.dueOn}T00:00:00`))
                : 'No dates set'
            }
            icon={CalendarClock}
            label="Next payment"
            value={upcomingPayment?.title ?? 'None'}
          />
        </div>
      </div>

      <ActionButtons
        onAddClick={() => setModalType('income')}
        onExpenseClick={() => setModalType('expense')}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Seven-day flow
              </h2>
              <p className="text-sm text-muted-foreground">
                Income and expense totals
              </p>
            </div>
            <ReceiptText className="text-muted-foreground" size={20} />
          </div>
          <SpendingChart currency={currency} data={chartData} />
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Recent transactions
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading ledger' : `${transactions.length} saved`}
              </p>
            </div>
          </div>

          <TransactionList
            categories={categories}
            currency={currency}
            transactions={transactions.slice(0, 8)}
          />
        </section>
      </div>

      <TransactionModal
        categories={modalCategories}
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        onSubmit={handleModalSubmit}
        type={modalType ?? 'expense'}
      />
    </section>
  )
}
