'use client'

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import {
  Check,
  CircleDollarSign,
  Globe2,
  LocateFixed,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/components/finance-provider'
import {
  getCurrencyDisplayName,
  getCurrencyForLocale,
  getCurrencyOptions,
  isValidCurrencyCode,
  normalizeCurrencyCode,
  POPULAR_CURRENCY_CODES,
} from '@/lib/currencies'
import { DEFAULT_CURRENCY } from '@/lib/defaults'
import { formatCurrency } from '@/lib/format'

const SERVER_LOCALE_SNAPSHOT = 'en-US|'

function subscribeToLocale() {
  return () => {}
}

function getLocaleSnapshot() {
  if (typeof navigator === 'undefined') {
    return SERVER_LOCALE_SNAPSHOT
  }

  const locales =
    navigator.languages.length > 0 ? navigator.languages : [navigator.language]
  const locale = locales[0] ?? 'en-US'
  const localCurrency = getCurrencyForLocale(locales) ?? ''

  return `${locale}|${localCurrency}`
}

export default function CurrencyPage() {
  const { currency, setCurrency } = useFinance()
  const [query, setQuery] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [error, setError] = useState('')
  const localeSnapshot = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    () => SERVER_LOCALE_SNAPSHOT,
  )
  const separatorIndex = localeSnapshot.indexOf('|')
  const locale =
    separatorIndex >= 0 ? localeSnapshot.slice(0, separatorIndex) : 'en-US'
  const localCurrencyValue =
    separatorIndex >= 0 ? localeSnapshot.slice(separatorIndex + 1) : ''
  const localCurrency = localCurrencyValue || null

  const currencyOptions = getCurrencyOptions(locale)
  const currentCurrencyName = getCurrencyDisplayName(currency, locale)
  const localCurrencyName = localCurrency
    ? getCurrencyDisplayName(localCurrency, locale)
    : null
  const popularOptions = currencyOptions.filter((option) =>
    POPULAR_CURRENCY_CODES.includes(
      option.code as (typeof POPULAR_CURRENCY_CODES)[number],
    ),
  )
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = normalizedQuery
    ? currencyOptions.filter((option) => {
        return (
          option.code.toLowerCase().includes(normalizedQuery) ||
          option.label.toLowerCase().includes(normalizedQuery)
        )
      })
    : currencyOptions

  const selectCurrency = async (code: string) => {
    setError('')

    try {
      await setCurrency(normalizeCurrencyCode(code))
      setCustomCode('')
    } catch {
      setError('That currency could not be saved.')
    }
  }

  const handleCustomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeCurrencyCode(customCode)

    if (!isValidCurrencyCode(normalized)) {
      setError('Enter a valid 3-letter ISO currency code.')
      return
    }

    await selectCurrency(normalized)
  }

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

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Current currency
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {currency}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {currentCurrencyName}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CircleDollarSign size={22} />
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Preview</p>
            <p className="mt-1 break-words text-2xl font-semibold">
              {formatCurrency(1284.75, currency)}
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {localCurrency && localCurrency !== currency ? (
              <Button
                className="h-auto min-h-11 justify-start gap-2 whitespace-normal text-left"
                onClick={() => void selectCurrency(localCurrency)}
                type="button"
              >
                <LocateFixed size={16} />
                Use {localCurrency} · {localCurrencyName}
              </Button>
            ) : null}
            <Button
              className="h-11 justify-start gap-2"
              onClick={() => void selectCurrency(DEFAULT_CURRENCY)}
              type="button"
              variant="outline"
            >
              <RotateCcw size={16} />
              Reset to {DEFAULT_CURRENCY}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Global currencies</h2>
              <p className="text-sm text-muted-foreground">
                {currencyOptions.length} ISO codes available
              </p>
            </div>
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <Globe2 size={20} />
            </div>
          </div>

          <label className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="shrink-0 text-muted-foreground" size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by country, currency, or code"
              type="search"
              value={query}
            />
          </label>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Popular
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {popularOptions.map((option) => (
                <CurrencyButton
                  code={option.code}
                  key={option.code}
                  label={option.label}
                  onSelect={selectCurrency}
                  selected={option.code === currency}
                />
              ))}
            </div>
          </div>

          <form
            className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={handleCustomSubmit}
          >
            <label className="min-w-0">
              <span className="sr-only">Custom currency code</span>
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm uppercase text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={3}
                onChange={(event) => setCustomCode(event.target.value)}
                placeholder="Custom code, e.g. PHP"
                value={customCode}
              />
            </label>
            <Button className="h-11" type="submit" variant="outline">
              Use code
            </Button>
          </form>

          {error ? (
            <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-4 max-h-[34rem] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredOptions.map((option) => (
                <CurrencyButton
                  code={option.code}
                  key={option.code}
                  label={option.label}
                  onSelect={selectCurrency}
                  selected={option.code === currency}
                />
              ))}
            </div>
            {filteredOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                No matching currency found.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}

function CurrencyButton({
  code,
  label,
  onSelect,
  selected,
}: {
  code: string
  label: string
  onSelect: (code: string) => Promise<void>
  selected: boolean
}) {
  return (
    <button
      className={`flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-background hover:bg-muted'
      }`}
      onClick={() => void onSelect(code)}
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{code}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {label}
        </span>
      </span>
      {selected ? <Check className="shrink-0 text-primary" size={18} /> : null}
    </button>
  )
}
