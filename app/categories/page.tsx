'use client'

import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/components/finance-provider'
import type { TransactionType } from '@/lib/finance-types'

const CATEGORY_COLORS = [
  '#0f766e',
  '#2563eb',
  '#ca8a04',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#525252',
]

export default function CategoriesPage() {
  const { addCategory, archiveCategory, categories } = useFinance()
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState(CATEGORY_COLORS[0])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) return

    await addCategory({
      color,
      name: trimmed,
      type,
    })
    setName('')
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Categories
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Spending setup
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Add category</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Travel"
              type="text"
              value={name}
            />

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
              {(['expense', 'income'] as TransactionType[]).map((option) => (
                <button
                  className={`h-10 rounded-md text-sm font-medium transition ${
                    type === option
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  key={option}
                  onClick={() => setType(option)}
                  type="button"
                >
                  {option === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((swatch) => (
                  <button
                    aria-label={`Use ${swatch}`}
                    className={`h-8 w-8 rounded-lg border ${
                      color === swatch
                        ? 'border-foreground ring-2 ring-ring/40'
                        : 'border-border'
                    }`}
                    key={swatch}
                    onClick={() => setColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <Button className="h-11 w-full gap-2" type="submit">
              <Plus size={16} />
              Add category
            </Button>
          </form>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your categories</h2>
              <p className="text-sm text-muted-foreground">
                {categories.length} active
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <article
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                key={category.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {category.name}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {category.isDefault ? 'Default' : 'Custom'} {category.type}
                    </p>
                  </div>
                </div>
                {!category.isDefault ? (
                  <Button
                    aria-label={`Archive ${category.name}`}
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => void archiveCategory(category.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
