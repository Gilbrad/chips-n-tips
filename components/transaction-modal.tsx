'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { toDateInputValue } from '@/lib/dates'
import type {
  Category,
  Transaction,
  TransactionType,
} from '@/lib/finance-types'

interface TransactionModalProps {
  categories: Category[]
  initialTransaction?: Transaction
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: {
    amount: number
    categoryId: string
    description: string
    occurredOn: string
    type: TransactionType
  }) => Promise<void> | void
  type: TransactionType
}

export default function TransactionModal({
  categories,
  initialTransaction,
  isOpen,
  onClose,
  onSubmit,
  type,
}: TransactionModalProps) {
  const [amount, setAmount] = useState(
    initialTransaction ? String(initialTransaction.amount) : '',
  )
  const [description, setDescription] = useState(
    initialTransaction?.description ?? '',
  )
  const [categoryId, setCategoryId] = useState(
    initialTransaction?.categoryId ?? '',
  )
  const [occurredOn, setOccurredOn] = useState(
    initialTransaction?.occurredOn ?? toDateInputValue(),
  )
  const [transactionType, setTransactionType] = useState(
    initialTransaction?.type ?? type,
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === transactionType),
    [categories, transactionType],
  )
  const selectedCategoryId = filteredCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : (filteredCategories[0]?.id ?? '')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = Number(amount)
    const trimmedDescription = description.trim()

    if (
      !parsedAmount ||
      parsedAmount <= 0 ||
      !trimmedDescription ||
      !selectedCategoryId
    ) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onSubmit({
        amount: parsedAmount,
        categoryId: selectedCategoryId,
        description: trimmedDescription,
        occurredOn,
        type: transactionType,
      })
    } catch {
      setError('Could not save this transaction. Please try again.')
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const title = initialTransaction
    ? 'Edit transaction'
    : transactionType === 'income'
      ? 'Add income'
      : 'Add expense'

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center">
      <div
        aria-labelledby="transaction-modal-title"
        aria-modal="true"
        className="w-full animate-in slide-in-from-bottom bg-card p-5 shadow-xl sm:max-w-md sm:rounded-lg sm:border sm:border-border sm:slide-in-from-bottom-0 sm:zoom-in-95"
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-xl font-semibold text-foreground"
            id="transaction-modal-title"
          >
            {title}
          </h2>
          <button
            aria-label="Close modal"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-foreground">
              Type
            </legend>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(['expense', 'income'] as TransactionType[]).map((option) => (
                <button
                  aria-pressed={transactionType === option}
                  className={`h-9 rounded-md text-sm font-medium capitalize transition-colors ${
                    transactionType === option
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  key={option}
                  onClick={() => setTransactionType(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Amount
            </label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              min="0"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={amount}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Description
            </label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setDescription(event.target.value)}
              maxLength={160}
              placeholder="What is this for?"
              type="text"
              value={description}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Category
            </label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCategoryId(event.target.value)}
              value={selectedCategoryId}
            >
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Date
            </label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setOccurredOn(event.target.value)}
              type="date"
              value={occurredOn}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              disabled={isSaving}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${
                transactionType === 'income'
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'bg-destructive text-primary-foreground hover:bg-destructive/90'
              }`}
              disabled={
                isSaving || !amount || !description.trim() || !selectedCategoryId
              }
              type="submit"
            >
              {isSaving
                ? 'Saving'
                : initialTransaction
                  ? 'Save changes'
                  : 'Save'}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
