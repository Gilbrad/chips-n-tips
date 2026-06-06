export function toDateInputValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function isDateWithinRange(
  dateValue: string,
  startDate: string,
  endDate?: string,
): boolean {
  return dateValue >= startDate && dateValue <= (endDate ?? startDate)
}

export function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

export function getMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
}
