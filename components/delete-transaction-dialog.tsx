'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/lib/finance-types'

interface DeleteTransactionDialogProps {
  onClose: () => void
  onConfirm: () => Promise<void>
  transaction: Transaction
}

export default function DeleteTransactionDialog({
  onClose,
  onConfirm,
  transaction,
}: DeleteTransactionDialogProps) {
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    setError('')

    try {
      await onConfirm()
    } catch {
      setError('Could not delete this transaction. Please try again.')
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center">
      <div
        aria-labelledby="delete-transaction-title"
        aria-modal="true"
        className="w-full bg-card p-5 shadow-xl sm:max-w-md sm:rounded-lg sm:border sm:border-border"
        role="alertdialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <Trash2 size={20} />
            </div>
            <div>
              <h2
                className="text-lg font-semibold text-foreground"
                id="delete-transaction-title"
              >
                Delete transaction?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                &ldquo;{transaction.description}&rdquo; will be removed from
                your ledger and synced to your backup when available.
              </p>
            </div>
          </div>
          <button
            aria-label="Close delete confirmation"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <Button disabled={isDeleting} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={() => void handleConfirm()}
            variant="destructive"
          >
            {isDeleting ? 'Deleting' : 'Delete'}
          </Button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
