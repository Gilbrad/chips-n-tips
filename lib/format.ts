import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/defaults'

export function getCurrencyMeta(currencyCode: string) {
  return (
    SUPPORTED_CURRENCIES.find((currency) => currency.code === currencyCode) ??
    SUPPORTED_CURRENCIES.find((currency) => currency.code === DEFAULT_CURRENCY)!
  )
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyMeta(currencyCode)

  return new Intl.NumberFormat(currency.locale, {
    currency: currency.code,
    maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    style: 'currency',
  }).format(amount)
}

export function formatCompactCurrency(
  amount: number,
  currencyCode: string,
): string {
  const currency = getCurrencyMeta(currencyCode)

  return new Intl.NumberFormat(currency.locale, {
    currency: currency.code,
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(amount)
}

export function formatDateLabel(dateValue: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`))
}

export function formatDateRangeLabel(
  startDate: string,
  endDate?: string,
): string {
  if (!endDate || endDate === startDate) {
    return formatDateLabel(startDate)
  }

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`
}
