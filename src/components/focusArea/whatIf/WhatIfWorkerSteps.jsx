import { useState } from 'react'

const WORKER_COMMANDS = ['cd /d e:\\mount-lavinia-dashboard', 'npm run what-if:worker']

/** Scannable Command Prompt steps — never bury these in a paragraph. */
export default function WhatIfWorkerSteps({
  after = 'Leave that window open. Then click Connect and paste the pairing token it printed.',
}) {
  const [copied, setCopied] = useState(false)
  const block = WORKER_COMMANDS.join('\n')

  async function copyLines() {
    try {
      await navigator.clipboard.writeText(block)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <p className="text-[12px] text-surface-200">In Command Prompt:</p>
      <div className="relative rounded-md border border-surface-600 bg-surface-950 px-2.5 py-2">
        <pre className="m-0 overflow-x-auto font-mono text-[12px] leading-relaxed text-surface-100">
          {WORKER_COMMANDS.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </pre>
        <button
          type="button"
          onClick={() => void copyLines()}
          className="absolute right-1.5 top-1.5 rounded border border-surface-600 bg-surface-800 px-1.5 py-0.5 text-[10px] text-surface-200 hover:bg-surface-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {after ? <p className="text-[12px] leading-snug text-surface-300">{after}</p> : null}
    </div>
  )
}
