import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface ActionButtonsProps {
  onAddClick: () => void
  onExpenseClick: () => void
}

export default function ActionButtons({
  onAddClick,
  onExpenseClick,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onAddClick}
        className="h-11 flex-1 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
      >
        <Plus size={20} />
        Add income
      </Button>
      <Button
        onClick={onExpenseClick}
        variant="outline"
        className="h-11 flex-1 gap-2 border-destructive/40 font-semibold text-destructive hover:bg-destructive/10"
      >
        <Minus size={20} />
        Add expense
      </Button>
    </div>
  )
}
