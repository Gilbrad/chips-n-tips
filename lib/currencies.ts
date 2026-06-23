export interface CurrencyOption {
  code: string
  label: string
}

export const POPULAR_CURRENCY_CODES = [
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'HKD',
  'NZD',
  'SEK',
  'KRW',
  'SGD',
  'NOK',
  'MXN',
  'INR',
  'PHP',
] as const

const FALLBACK_CURRENCY_CODES = [
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CRC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'UYU',
  'UZS',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XCD',
  'XOF',
  'XPF',
  'YER',
  'ZAR',
  'ZMW',
] as const

const COUNTRY_CURRENCY: Record<string, string> = {
  AE: 'AED',
  AR: 'ARS',
  AT: 'EUR',
  AU: 'AUD',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CL: 'CLP',
  CN: 'CNY',
  CO: 'COP',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  EG: 'EGP',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GR: 'EUR',
  HK: 'HKD',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  MX: 'MXN',
  MY: 'MYR',
  NG: 'NGN',
  NL: 'EUR',
  NO: 'NOK',
  NZ: 'NZD',
  PE: 'PEN',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PT: 'EUR',
  RO: 'RON',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  TH: 'THB',
  TR: 'TRY',
  TW: 'TWD',
  UA: 'UAH',
  US: 'USD',
  VN: 'VND',
  ZA: 'ZAR',
}

function getRegionFromLocale(locale: string) {
  try {
    return new Intl.Locale(locale).region?.toUpperCase()
  } catch {
    const match = locale.match(/[-_]([A-Za-z]{2})\b/)
    return match?.[1].toUpperCase()
  }
}

export function normalizeCurrencyCode(code: string) {
  return code.trim().toUpperCase()
}

export function isValidCurrencyCode(code: string) {
  const normalized = normalizeCurrencyCode(code)

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return false
  }

  try {
    new Intl.NumberFormat('en-US', {
      currency: normalized,
      style: 'currency',
    }).format(1)

    return true
  } catch {
    return false
  }
}

export function getAvailableCurrencyCodes() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('currency')
  }

  return [...FALLBACK_CURRENCY_CODES]
}

export function getCurrencyDisplayName(code: string, locale = 'en-US') {
  const normalized = normalizeCurrencyCode(code)

  try {
    return (
      new Intl.DisplayNames([locale], { type: 'currency' }).of(normalized) ??
      normalized
    )
  } catch {
    return normalized
  }
}

export function getCurrencyForLocale(locales: readonly string[]) {
  for (const locale of locales) {
    const region = getRegionFromLocale(locale)

    if (region && COUNTRY_CURRENCY[region]) {
      return COUNTRY_CURRENCY[region]
    }
  }

  return null
}

export function getCurrencyOptions(locale = 'en-US'): CurrencyOption[] {
  const seen = new Set<string>()
  const codes = [...POPULAR_CURRENCY_CODES, ...getAvailableCurrencyCodes()]

  return codes
    .map(normalizeCurrencyCode)
    .filter((code) => {
      if (seen.has(code) || !isValidCurrencyCode(code)) {
        return false
      }

      seen.add(code)
      return true
    })
    .map((code) => ({
      code,
      label: getCurrencyDisplayName(code, locale),
    }))
}
