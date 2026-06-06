import Link from 'next/link'
import { CloudOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function OfflineFallbackPage() {
  return (
    <section className="mx-auto flex min-h-[70dvh] w-full max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">
        <CloudOff size={28} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">This page is not cached yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved ledger is still available. Return to the dashboard and
          keep tracking while offline.
        </p>
      </div>
      <Link className={buttonVariants()} href="/">
        Open dashboard
      </Link>
    </section>
  )
}
