'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { toDateInputValue } from '@/lib/dates'
import type { Category, TransactionType } from '@/lib/finance-types'

interface TransactionModalProps {
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: {
    amount: number
    categoryId: string
    description: string
    occurredOn: string
  }) => Promise<void> | void
  type: TransactionType
}

export default function TransactionModal({
  categories,
  isOpen,
  onClose,
  onSubmit,
  type,
}: TransactionModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [occurredOn, setOccurredOn] = useState(toDateInputValue())

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
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

    await onSubmit({
      amount: parsedAmount,
      categoryId: selectedCategoryId,
      description: trimmedDescription,
      occurredOn,
    })

    setAmount('')
    setDescription('')
    setOccurredOn(toDateInputValue())
  }

  if (!isOpen) return null

  const title = type === 'income' ? 'Add income' : 'Add expense'

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full animate-in slide-in-from-bottom bg-card p-5 shadow-xl sm:max-w-md sm:rounded-lg sm:border sm:border-border sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button
            aria-label="Close modal"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${
                type === 'income'
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'bg-destructive text-primary-foreground hover:bg-destructive/90'
              }`}
              disabled={!amount || !description.trim() || !selectedCategoryId}
              type="submit"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
