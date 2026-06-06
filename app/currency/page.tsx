'use client'

import { Check, CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/components/finance-provider'
import { SUPPORTED_CURRENCIES } from '@/lib/defaults'
import { formatCurrency } from '@/lib/format'

export default function CurrencyPage() {
  const { currency, setCurrency } = useFinance()

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Currency
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Display money as
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Current currency
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {currency}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CircleDollarSign size={22} />
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Preview</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(1284.75, currency)}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPORTED_CURRENCIES.map((option) => {
              const selected = option.code === currency

              return (
                <button
                  className={`flex min-h-20 items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-muted'
                  }`}
                  key={option.code}
                  onClick={() => void setCurrency(option.code)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {option.code}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {option.label}
                    </span>
                  </span>
                  {selected ? <Check className="text-primary" size={18} /> : null}
                </button>
              )
            })}
          </div>
          <Button
            className="mt-4 h-11 w-full"
            onClick={() => void setCurrency('USD')}
            type="button"
            variant="outline"
          >
            Reset to USD
          </Button>
        </section>
      </div>
    </section>
  )
}
