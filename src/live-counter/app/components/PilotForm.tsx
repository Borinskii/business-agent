'use client'

import { useState } from 'react'

interface Props {
  companyId: string
  companyName: string
}

export default function PilotForm({ companyId, companyName }: Props) {
  const [icp, setIcp] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (icp.trim().length < 10) {
      setErrorMsg('Please describe your ICP in at least 10 characters.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/start-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, icp_description: icp.trim(), email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Something went wrong')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">🚀</div>
        <p className="text-green-400 font-bold text-lg">Pilot starting within 1 hour!</p>
        <p className="text-slate-400 text-sm mt-2">
          Agent Frank will reach out to prospects for {companyName} and send you live updates.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Who should Agent Frank target? <span className="text-red-400">*</span>
        </label>
        <textarea
          value={icp}
          onChange={(e) => setIcp(e.target.value)}
          placeholder="e.g. VP Sales at B2B SaaS companies 50-200 employees in USA using HubSpot"
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          required
          minLength={10}
        />
        <p className="text-slate-500 text-xs mt-1">{icp.length} chars (min 10)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Your email — we&apos;ll send live results here
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {errorMsg && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {status === 'loading' ? 'Starting pilot…' : 'Start 48H Free Pilot →'}
      </button>

      <p className="text-slate-600 text-xs text-center">
        No credit card. No commitment. Cancel anytime.
      </p>
    </form>
  )
}
