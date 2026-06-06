'use client'

import { useEffect, useState } from 'react'
import { CloudUpload, Database } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useFinance } from '@/components/finance-provider'
import { Button } from '@/components/ui/button'
import {
  getLocalImportSummary,
  type LocalImportSummary,
} from '@/lib/offline-db'

function importDecisionKey(userId: string) {
  return `chipsntips-local-imported:${userId}`
}

export default function LocalDataImportPrompt() {
  const { user } = useAuth()
  const { importLocalData } = useFinance()
  const [summary, setSummary] = useState<LocalImportSummary | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || window.localStorage.getItem(importDecisionKey(user.id))) {
      return
    }

    let active = true

    void getLocalImportSummary().then((nextSummary) => {
      if (active && nextSummary.hasData) {
        setSummary(nextSummary)
      }
    })

    return () => {
      active = false
    }
  }, [user])

  if (!user || !summary) {
    return null
  }

  const handleImport = async () => {
    setIsImporting(true)
    setError(null)

    try {
      await importLocalData()
      window.localStorage.setItem(importDecisionKey(user.id), new Date().toISOString())
      setSummary(null)
    } catch {
      setError('The local data is still safe on this device. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <section className="w-full bg-card p-5 text-card-foreground shadow-xl sm:max-w-md sm:rounded-lg sm:border sm:border-border">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Import local data?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This device has an offline ledger. Importing copies it into your
              account&apos;s private local cache and backs it up to Supabase.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/60 p-3 text-center">
            <p className="text-lg font-semibold">{summary.transactions}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-center">
            <p className="text-lg font-semibold">{summary.paymentDates}</p>
            <p className="text-xs text-muted-foreground">Payments</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-center">
            <p className="text-lg font-semibold">{summary.customCategories}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <Button
            className="flex-1"
            disabled={isImporting}
            onClick={() => setSummary(null)}
            type="button"
            variant="outline"
          >
            Not now
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={isImporting}
            onClick={() => void handleImport()}
            type="button"
          >
            <CloudUpload size={16} />
            {isImporting ? 'Importing' : 'Import data'}
          </Button>
        </div>
      </section>
    </div>
  )
}
