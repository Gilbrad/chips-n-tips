import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  description: string
  icon: LucideIcon
  label: string
  value: string
}

export default function StatsCard({
  description,
  icon: Icon,
  label,
  value,
}: StatsCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-lg bg-accent/15 p-2 text-accent">
          <Icon size={20} />
        </div>
      </div>
    </section>
  )
}
