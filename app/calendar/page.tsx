'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/components/finance-provider'
import { getMonthGrid, getMonthTitle, toDateInputValue } from '@/lib/dates'
import { formatCurrency, formatDateLabel } from '@/lib/format'
import type { PaymentDate, Recurrence } from '@/lib/finance-types'

export default function CalendarPage() {
  const {
    addPaymentDate,
    categories,
    currency,
    paymentDates,
    togglePaymentDatePaid,
    transactions,
  } = useFinance()
  const now = new Date()
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(toDateInputValue())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [notes, setNotes] = useState('')

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const calendarDays = useMemo(() => getMonthGrid(year, month), [month, year])
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  )

  const totalsByDay = useMemo(() => {
    return transactions.reduce<Record<string, number>>((totals, transaction) => {
      if (transaction.type === 'expense') {
        totals[transaction.occurredOn] =
          (totals[transaction.occurredOn] ?? 0) + transaction.amount
      }

      return totals
    }, {})
  }, [transactions])

  const paymentsByDay = useMemo(() => {
    return paymentDates.reduce<Record<string, PaymentDate[]>>(
      (groups, paymentDate) => {
        groups[paymentDate.dueOn] = [
          ...(groups[paymentDate.dueOn] ?? []),
          paymentDate,
        ]

        return groups
      },
      {},
    )
  }, [paymentDates])

  const selectedPayments = paymentsByDay[selectedDate] ?? []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      return
    }

    await addPaymentDate({
      amount: amount ? Number(amount) : undefined,
      categoryId: categoryId || undefined,
      dueOn: selectedDate,
      notes: notes.trim() || undefined,
      recurrence,
      title: trimmedTitle,
    })

    setTitle('')
    setAmount('')
    setNotes('')
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Calendar
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Payment dates
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous month"
            onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            onClick={() =>
              setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
            }
            type="button"
            variant="outline"
          >
            Today
          </Button>
          <Button
            aria-label="Next month"
            onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              {getMonthTitle(year, month)}
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div className="py-2" key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const iso = toDateInputValue(day)
              const total = totalsByDay[iso] ?? 0
              const hasPayment = Boolean(paymentsByDay[iso]?.length)
              const inMonth = day.getMonth() === month
              const selected = selectedDate === iso

              return (
                <button
                  className={`min-h-24 rounded-lg border p-2 text-left transition ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-muted'
                  } ${inMonth ? '' : 'opacity-45'}`}
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  type="button"
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{day.getDate()}</span>
                    {hasPayment ? (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {total ? formatCurrency(total, currency) : 'No expenses'}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Add payment</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Rent, loan, subscription"
                type="text"
                value={title}
              />
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                step="0.01"
                type="number"
                value={amount}
              />
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setCategoryId(event.target.value)}
                value={categoryId}
              >
                <option value="">No category</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setRecurrence(event.target.value as Recurrence)}
                value={recurrence}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <textarea
                className="min-h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes"
                value={notes}
              />
              <Button className="h-11 w-full gap-2" type="submit">
                <Plus size={16} />
                Save payment
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">
                {formatDateLabel(selectedDate)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(totalsByDay[selectedDate] ?? 0, currency)} spent
              </p>
            </div>

            {selectedPayments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                No payments on this date.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedPayments.map((paymentDate) => (
                  <article
                    className="rounded-lg border border-border bg-background p-3"
                    key={paymentDate.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {paymentDate.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {paymentDate.amount
                            ? formatCurrency(paymentDate.amount, currency)
                            : 'No amount'}{' '}
                          / {paymentDate.recurrence}
                        </p>
                      </div>
                      <Button
                        aria-label={
                          paymentDate.paidAt
                            ? 'Mark payment unpaid'
                            : 'Mark payment paid'
                        }
                        onClick={() =>
                          void togglePaymentDatePaid(paymentDate.id)
                        }
                        size="icon"
                        type="button"
                        variant={paymentDate.paidAt ? 'default' : 'outline'}
                      >
                        <CheckCircle2 size={16} />
                      </Button>
                    </div>
                    {paymentDate.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {paymentDate.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  )
}
