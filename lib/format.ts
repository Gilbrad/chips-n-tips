import {
  getCurrencyDisplayName,
  isValidCurrencyCode,
  normalizeCurrencyCode,
} from '@/lib/currencies'
import { DEFAULT_CURRENCY } from '@/lib/defaults'

export function getCurrencyMeta(currencyCode: string) {
  const code = normalizeCurrencyCode(currencyCode)
  const safeCode = isValidCurrencyCode(code) ? code : DEFAULT_CURRENCY

  return {
    code: safeCode,
    label: getCurrencyDisplayName(safeCode),
    locale: 'en-US',
  }
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrencyMeta(currencyCode)

  return new Intl.NumberFormat(currency.locale, {
    currency: currency.code,
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
