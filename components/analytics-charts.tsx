'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  CategoryAnalyticsPoint,
  MonthlyAnalyticsPoint,
} from '@/lib/analytics'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

interface AnalyticsChartsProps {
  categories: CategoryAnalyticsPoint[]
  currency: string
  hasExpenses: boolean
  hasTransactions: boolean
  monthly: MonthlyAnalyticsPoint[]
}

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function CurrencyTooltip({
  currency,
  value,
}: {
  currency: string
  value: unknown
}) {
  return formatCurrency(Number(value), currency)
}

export default function AnalyticsCharts({
  categories,
  currency,
  hasExpenses,
  hasTransactions,
  monthly,
}: AnalyticsChartsProps) {
  const chartMargin = { bottom: 0, left: 0, right: 8, top: 12 }
  const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        description="Expense totals over the last 12 months"
        title="Expenses per month"
      >
        {hasExpenses ? (
          <div className="h-72 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                accessibilityLayer
                data={monthly}
                margin={chartMargin}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  tick={axisTick}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={(value) =>
                    formatCompactCurrency(Number(value), currency)
                  }
                  tickLine={false}
                  width={68}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    fill: 'color-mix(in oklch, var(--muted) 50%, transparent)',
                  }}
                  formatter={(value) => [
                    <CurrencyTooltip
                      currency={currency}
                      key="expense"
                      value={value}
                    />,
                    'Expenses',
                  ]}
                  labelClassName="text-foreground"
                />
                <Bar
                  dataKey="expense"
                  fill="var(--chart-3)"
                  name="Expenses"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Add an expense to start seeing monthly spending." />
        )}
      </ChartCard>

      <ChartCard
        description="Monthly cash flowing in and out"
        title="Income vs expenses"
      >
        {hasTransactions ? (
          <div className="h-72 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                accessibilityLayer
                data={monthly}
                margin={chartMargin}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  tick={axisTick}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={(value) =>
                    formatCompactCurrency(Number(value), currency)
                  }
                  tickLine={false}
                  width={68}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    <CurrencyTooltip
                      currency={currency}
                      key={String(name)}
                      value={value}
                    />,
                    name,
                  ]}
                  labelClassName="text-foreground"
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                  iconType="circle"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="income"
                  dot={false}
                  name="Income"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="expense"
                  dot={false}
                  name="Expenses"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Add income and expenses to compare your monthly flow." />
        )}
      </ChartCard>

      <ChartCard
        description="Share of expenses over the last 12 months"
        title="Spending categories"
      >
        {categories.length > 0 ? (
          <div>
            <div className="h-56 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={categories}
                    dataKey="value"
                    innerRadius={56}
                    nameKey="name"
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {categories.map((category) => (
                      <Cell fill={category.color} key={category.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      <CurrencyTooltip
                        currency={currency}
                        key={String(name)}
                        value={value}
                      />,
                      name,
                    ]}
                    labelClassName="text-foreground"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
              {categories.slice(0, 6).map((category) => (
                <div
                  className="flex min-w-0 items-center justify-between gap-3 text-sm"
                  key={category.name}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-muted-foreground">
                      {category.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatCompactCurrency(category.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart message="Categorized expenses will appear here." />
        )}
      </ChartCard>

      <ChartCard
        description="Cumulative balance at the end of each month"
        title="Balance history"
      >
        {hasTransactions ? (
          <div className="h-72 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                accessibilityLayer
                data={monthly}
                margin={chartMargin}
              >
                <defs>
                  <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  tick={axisTick}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={(value) =>
                    formatCompactCurrency(Number(value), currency)
                  }
                  tickLine={false}
                  width={68}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    <CurrencyTooltip
                      currency={currency}
                      key="balance"
                      value={value}
                    />,
                    'Balance',
                  ]}
                  labelClassName="text-foreground"
                />
                <Area
                  dataKey="balance"
                  fill="url(#balanceFill)"
                  name="Balance"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Your balance history will build as transactions are added." />
        )}
      </ChartCard>
    </div>
  )
}
