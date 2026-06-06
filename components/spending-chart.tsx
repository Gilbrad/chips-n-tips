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
import { formatCurrency } from '@/lib/format'

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
    <div className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ bottom: 0, left: 0, right: 8, top: 12 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(Number(value), currency)}
            tickLine={false}
            width={78}
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
