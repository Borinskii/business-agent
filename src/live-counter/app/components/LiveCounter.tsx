'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  monthlyLoss: number
  sdrCount?: number
  companyId: string
  slug: string
}

export default function LiveCounter({ monthlyLoss, companyId, slug }: Props) {
  const [dollars, setDollars] = useState(0)
  const pageOpenedSent = useRef(false)

  const lossPerSecond = monthlyLoss / 30 / 24 / 3600

  useEffect(() => {
    // Notify backend — deduplicated by ip_hash server-side
    if (!pageOpenedSent.current) {
      pageOpenedSent.current = true
      fetch('/api/page-opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, slug }),
      }).catch(() => {/* non-critical */})
    }

    // Tick every second
    const interval = setInterval(() => {
      setDollars((prev) => prev + lossPerSecond)
    }, 1000)

    return () => clearInterval(interval)
  }, [companyId, slug, lossPerSecond])

  const formatted = dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div className="my-4">
      <div className="text-6xl md:text-7xl font-black tabular-nums text-red-500 tracking-tight">
        {formatted}
      </div>
      <p className="text-slate-500 text-xs mt-2 tabular-nums">
        +${lossPerSecond.toFixed(4)} every second
      </p>
    </div>
  )
}
