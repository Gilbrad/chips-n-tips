'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import PaymentReminderSettings from '@/components/payment-reminder-settings'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/components/finance-provider'
import {
  getMonthGrid,
  getMonthTitle,
  isDateWithinRange,
  toDateInputValue,
} from '@/lib/dates'
import {
  formatCurrency,
  formatDateLabel,
  formatDateRangeLabel,
} from '@/lib/format'
import type { PaymentDate, Recurrence } from '@/lib/finance-types'

type DateMode = 'specific' | 'range'

export default function CalendarPage() {
  const {
    addPaymentDate,
    categories,
    currency,
    deletePaymentDate,
    paymentDates,
    togglePaymentDatePaid,
    transactions,
  } = useFinance()
  const now = new Date()
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(toDateInputValue())
  const [dateMode, setDateMode] = useState<DateMode>('specific')
  const [rangeEndDate, setRangeEndDate] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [paymentDateToDelete, setPaymentDateToDelete] =
    useState<PaymentDate | null>(null)
  const [isDeletingPaymentDate, setIsDeletingPaymentDate] = useState(false)

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
    return Object.fromEntries(
      calendarDays.map((day) => {
        const dateValue = toDateInputValue(day)

        return [
          dateValue,
          paymentDates.filter((paymentDate) =>
            isDateWithinRange(
              dateValue,
              paymentDate.dueOn,
              paymentDate.dueEndOn,
            ),
          ),
        ]
      }),
    ) as Record<string, PaymentDate[]>
  }, [calendarDays, paymentDates])

  const selectedPayments = useMemo(
    () =>
      paymentDates.filter((paymentDate) =>
        isDateWithinRange(
          selectedDate,
          paymentDate.dueOn,
          paymentDate.dueEndOn,
        ),
      ),
    [paymentDates, selectedDate],
  )

  const selectStartDate = (dateValue: string) => {
    setSelectedDate(dateValue)

    if (rangeEndDate && rangeEndDate < dateValue) {
      setRangeEndDate('')
    }
  }

  const handleStartDateChange = (dateValue: string) => {
    selectStartDate(dateValue)

    if (dateValue) {
      const date = new Date(`${dateValue}T00:00:00`)
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const selectDateMode = (mode: DateMode) => {
    setDateMode(mode)

    if (mode === 'specific') {
      setRangeEndDate('')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (
      !trimmedTitle ||
      (dateMode === 'range' && (!rangeEndDate || rangeEndDate < selectedDate))
    ) {
      setError('Enter a title and make sure the date range is valid.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await addPaymentDate({
        amount: amount ? Number(amount) : undefined,
        categoryId: categoryId || undefined,
        dueEndOn: dateMode === 'range' ? rangeEndDate : undefined,
        dueOn: selectedDate,
        notes: notes.trim() || undefined,
        recurrence,
        title: trimmedTitle,
      })

      setTitle('')
      setAmount('')
      setRangeEndDate('')
      setNotes('')
    } catch {
      setError('Could not save this date. Please check the details and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePaymentDate = async () => {
    if (!paymentDateToDelete) {
      return
    }

    setIsDeletingPaymentDate(true)
    setError('')

    try {
      await deletePaymentDate(paymentDateToDelete.id)
      setPaymentDateToDelete(null)
    } catch {
      setError('Could not delete this calendar item. Please try again.')
    } finally {
      setIsDeletingPaymentDate(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Calendar
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Important dates
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
              const dayPayments = paymentsByDay[iso] ?? []
              const hasPayment = dayPayments.length > 0
              const hasRange = dayPayments.some(
                (paymentDate) =>
                  paymentDate.dueEndOn &&
                  paymentDate.dueEndOn !== paymentDate.dueOn,
              )
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
                  onClick={() => selectStartDate(iso)}
                  type="button"
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{day.getDate()}</span>
                    {hasPayment ? (
                      <span
                        className={`h-2 rounded-full bg-accent ${
                          hasRange ? 'w-5' : 'w-2'
                        }`}
                      />
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
            <h2 className="text-lg font-semibold">Add date or estimate</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Rent, subscription, parcel arrival"
                type="text"
                value={title}
              />
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
                {(['specific', 'range'] as DateMode[]).map((mode) => (
                  <button
                    className={`h-10 rounded-md text-sm font-medium transition ${
                      dateMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    key={mode}
                    onClick={() => selectDateMode(mode)}
                    type="button"
                  >
                    {mode === 'specific' ? 'Specific date' : 'Date range'}
                  </button>
                ))}
              </div>
              <div
                className={`grid gap-3 ${
                  dateMode === 'range' ? 'sm:grid-cols-2' : ''
                }`}
              >
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  {dateMode === 'range' ? 'Start date' : 'Date'}
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      handleStartDateChange(event.target.value)
                    }
                    required
                    type="date"
                    value={selectedDate}
                  />
                </label>
                {dateMode === 'range' ? (
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    End date
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min={selectedDate}
                      onChange={(event) => setRangeEndDate(event.target.value)}
                      required
                      type="date"
                      value={rangeEndDate}
                    />
                  </label>
                ) : null}
              </div>
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
              <Button
                className="h-11 w-full gap-2"
                disabled={isSaving}
                type="submit"
              >
                <Plus size={16} />
                {isSaving ? 'Saving' : 'Save date'}
              </Button>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </section>

          <PaymentReminderSettings />

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
                No important dates include this day.
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
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateRangeLabel(
                            paymentDate.dueOn,
                            paymentDate.dueEndOn,
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          aria-label={
                            paymentDate.paidAt
                              ? 'Mark item pending'
                              : 'Mark item complete'
                          }
                          onClick={() =>
                            void togglePaymentDatePaid(paymentDate.id)
                          }
                          size="icon"
                          title={
                            paymentDate.paidAt
                              ? 'Mark item pending'
                              : 'Mark item complete'
                          }
                          type="button"
                          variant={paymentDate.paidAt ? 'default' : 'outline'}
                        >
                          <CheckCircle2 size={16} />
                        </Button>
                        <Button
                          aria-label={`Delete ${paymentDate.title}`}
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setPaymentDateToDelete(paymentDate)}
                          size="icon"
                          title="Delete calendar item"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
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

      {paymentDateToDelete ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <section className="w-full bg-card p-5 text-card-foreground shadow-xl sm:max-w-md sm:rounded-lg sm:border sm:border-border">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Delete calendar item?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paymentDateToDelete.title} will be removed from this calendar
                  and synced as deleted on your other devices.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                className="flex-1"
                disabled={isDeletingPaymentDate}
                onClick={() => setPaymentDateToDelete(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={isDeletingPaymentDate}
                onClick={() => void handleDeletePaymentDate()}
                type="button"
                variant="destructive"
              >
                {isDeletingPaymentDate ? 'Deleting' : 'Delete'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
