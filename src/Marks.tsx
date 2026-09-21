import type { MarkKind, Pill } from './scenario'

/**
 * Squares mean the agent. Pictograms mean not the agent. Every mark is hidden
 * from screen readers, because the authority text beside it says the same thing.
 */
export function AuthorityMark({ kind, size = 'step' }: { kind: MarkKind; size?: 'step' | 'key' }) {
  const picto = kind === 'schedule' || kind === 'human'
  return (
    <span className={`mark mark-${size} ${picto ? 'picto' : 'square'}`} data-kind={kind} aria-hidden="true">
      {kind === 'within' && (
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="1.25" y="1.25" width="17.5" height="17.5" rx="3" fill="currentColor" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}
      {kind === 'needs-approval' && (
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="1.25" y="1.25" width="17.5" height="17.5" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}
      {kind === 'outside' && (
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="1.25" y="1.25" width="17.5" height="17.5" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M4.5 4.5 15.5 15.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {kind === 'schedule' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" focusable="false">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 6.5V12l3.5 2.5" />
        </svg>
      )}
      {kind === 'human' && (
        <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
          <circle cx="12" cy="7.5" r="4.5" />
          <path d="M3 22c0-5 4-8 9-8s9 3 9 8z" />
        </svg>
      )}
    </span>
  )
}

/** A status pill. The symbol is decoration. The words carry the status. */
export function StatusPill({ pill }: { pill: Pill }) {
  return (
    <span className={`pill ${pill.kind}`}>
      <span className="pill-symbol" aria-hidden="true">
        {pill.symbol}
      </span>
      {pill.text}
    </span>
  )
}

/** A numbered product section heading. The number ties it to the placard's reading guide. */
export function SectionHead({ id, number, children }: { id: string; number: number; children: string }) {
  return (
    <h3 className="sech" id={id}>
      <span className="num" aria-hidden="true">
        {number}
      </span>
      {children}
    </h3>
  )
}
