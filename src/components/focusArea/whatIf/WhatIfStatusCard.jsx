import {
  AlertCircle,
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  Pencil,
  Play,
  WifiOff,
} from 'lucide-react'
import { WHAT_IF_STATUS, getWhatIfWorkerBase } from '../../../constants/centralityWhatIf.js'
import WhatIfWorkerSteps from './WhatIfWorkerSteps.jsx'

function primaryState({ status, workerOnline, sdnaMissing }) {
  if (sdnaMissing) {
    return { title: 'sDNA not installed', Icon: AlertCircle, tone: 'error' }
  }
  if (status === WHAT_IF_STATUS.error) {
    return { title: 'Scenario error', Icon: AlertCircle, tone: 'error' }
  }
  if (status === WHAT_IF_STATUS.scenario) {
    return { title: 'Scenario active', Icon: CheckCircle2, tone: 'success' }
  }
  if (status === WHAT_IF_STATUS.computing) {
    return { title: 'Computing sDNA…', Icon: Loader2, tone: 'warning', spin: true }
  }
  if (status === WHAT_IF_STATUS.loading) {
    return { title: 'Loading results…', Icon: Loader2, tone: 'warning', spin: true }
  }
  if (status === WHAT_IF_STATUS.draft) {
    return { title: 'Draw proposed links', Icon: Pencil, tone: 'neutral' }
  }
  if (status === WHAT_IF_STATUS.needsCompute) {
    if (workerOnline) {
      return { title: 'Ready to run sDNA', Icon: Play, tone: 'warning' }
    }
    return { title: 'Worker offline', Icon: WifiOff, tone: 'warning' }
  }
  return { title: 'What-if scenario', Icon: Pencil, tone: 'neutral' }
}

function workerChipState({ workerOnline, workerReachable, sdnaMissing }) {
  if (sdnaMissing) {
    return { label: 'sDNA missing', dotClass: 'bg-rose-500', pulse: false }
  }
  if (workerOnline) {
    return { label: 'Worker online', dotClass: 'bg-emerald-500', pulse: true }
  }
  if (workerReachable) {
    return { label: 'Worker unreachable', dotClass: 'bg-rose-500', pulse: false }
  }
  return { label: 'Worker offline', dotClass: 'bg-slate-500', pulse: false }
}

const TITLE_TONE = {
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  error: 'text-rose-300',
  neutral: 'text-surface-50',
}

/** Scenario / worker status row for What-if side panels. */
export default function WhatIfStatusCard({
  status,
  workerOnline = false,
  workerReachable = false,
  sdnaMissing = false,
  nChanged = null,
  error = null,
  warning = null,
  onConnect,
  showWorkerSteps = true,
}) {
  const primary = primaryState({ status, workerOnline, sdnaMissing })
  const worker = workerChipState({ workerOnline, workerReachable, sdnaMissing })
  const PrimaryIcon = primary.Icon
  const showChanged = status === WHAT_IF_STATUS.scenario && nChanged != null

  return (
    <div role="status" aria-live="polite" className="shrink-0 px-0.5 py-0.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <PrimaryIcon
            className={`h-3.5 w-3.5 shrink-0 ${TITLE_TONE[primary.tone]} ${primary.spin ? 'animate-spin' : ''}`}
            aria-hidden
          />
          <p className={`truncate text-[11px] font-medium ${TITLE_TONE[primary.tone]}`}>
            {primary.title}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showChanged ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-surface-400">
              <GitCompareArrows className="h-3 w-3 shrink-0" aria-hidden />
              {nChanged} changed
            </span>
          ) : null}

          <span
            title={`Local worker at ${getWhatIfWorkerBase()}`}
            className="inline-flex items-center gap-1.5 text-[10px] text-surface-300"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {worker.pulse ? (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full ${worker.dotClass} opacity-75`}
                  aria-hidden
                />
              ) : null}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${worker.dotClass}`} />
            </span>
            {worker.label}
          </span>
          {!workerOnline && onConnect ? (
            <button
              type="button"
              onClick={() => void onConnect()}
              className="rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-500/20"
            >
              Connect
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-1.5 text-[10px] leading-snug text-rose-400">{error}</p> : null}
      {sdnaMissing && !error ? (
        <p className="mt-1.5 text-[12px] leading-snug text-rose-400">
          Install sDNA to C:\Program Files (x86)\sDNA. Then run the Command Prompt steps below and
          click Connect.
        </p>
      ) : null}
      {showWorkerSteps && !workerOnline && !error ? <WhatIfWorkerSteps /> : null}
      {warning && !error ? (
        <p className="mt-1.5 text-[10px] leading-snug text-amber-400">{warning}</p>
      ) : null}
    </div>
  )
}
