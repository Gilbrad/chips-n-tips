'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

export interface SpendingChartPoint {
  expense: number
  income: number
  label: string
}

export default function SpendingChart({
  currency,
  data,
}: {
  currency: string
  data: SpendingChartPoint[]
}) {
  return (
    <div className="h-64 min-w-0 w-full overflow-hidden">
      <ResponsiveContainer height="100%" minWidth={0} width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 0, left: -8, right: 0, top: 12 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            tickFormatter={(value) =>
              formatCompactCurrency(Number(value), currency)
            }
            tickLine={false}
            width={58}
          />
          <Tooltip
            cursor={{ fill: 'color-mix(in oklch, var(--muted) 50%, transparent)' }}
            formatter={(value, name) => [
              formatCurrency(Number(value), currency),
              name === 'expense' ? 'Expenses' : 'Income',
            ]}
            labelClassName="text-foreground"
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--popover-foreground)',
            }}
          />
          <Bar dataKey="expense" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
