import { forwardRef, type ReactNode } from 'react'
import { AuthorityMark, SectionHead } from './Marks'
import { getSetting, marksIn, product, ui, type PermissionId } from './scenario'

interface Props {
  permission: PermissionId
  /** How many steps are revealed. Equals the step count when not playing. */
  revealed: number
  /** True while a timed play is running, which outlines the log. */
  playing: boolean
  /**
   * The visible status line. Hidden from screen readers, which hear the same
   * news through the page's one live region instead.
   */
  status: string | null
}

type StepState = 'past' | 'now' | 'future'

export const ActivityLog = forwardRef<HTMLDivElement, Props>(function ActivityLog(
  { permission, revealed, playing, status },
  logRef,
) {
  const setting = getSetting(permission)
  const { steps, limitIndex, limitLabel } = setting

  const items: ReactNode[] = []
  steps.forEach((step, index) => {
    if (index === limitIndex) {
      /* The authority line is real text in reading order, reached like any step. */
      const lineState: StepState = index < revealed ? 'past' : 'future'
      items.push(
        <li key="limit" className={`limit ${lineState}`} data-testid="authority-line">
          <span className="visually-hidden">{ui.stepStateLabel[lineState]}</span>
          <span className="limit-label">{limitLabel}</span>
        </li>,
      )
    }

    const isCurrent = playing && index === revealed - 1
    const state: StepState = isCurrent ? 'now' : index >= revealed ? 'future' : 'past'
    const afterLine = index >= limitIndex
    items.push(
      <li
        key={step.id}
        className={`step ${state}${afterLine ? ' after' : ''}`}
        aria-current={isCurrent ? 'step' : undefined}
        data-mark={step.mark}
      >
        <AuthorityMark kind={step.mark} />
        <time>{step.time}</time>
        <span className="step-body">
          {/* State is spoken, never left to opacity or colour alone. */}
          <span className="visually-hidden">{ui.stepStateLabel[state]}</span>
          <b className="step-title">{step.title}</b>
          <small className="auth">
            {ui.markPrefix[step.mark]}: {step.authority}
          </small>
        </span>
      </li>,
    )
  })

  return (
    <div className={playing ? 'log live' : 'log'} tabIndex={-1} ref={logRef}>
      <SectionHead id="log-heading" number={2}>
        {product.logHeading}
      </SectionHead>

      <p className="log-status" aria-hidden="true">
        {status ?? ''}
      </p>

      <ol className="steps" aria-labelledby="log-heading">
        {items}
      </ol>

      {/*
        The key explains the marks, which are hidden from screen readers, so the
        key is hidden too. It lists only the marks present in this night.
      */}
      <div className="key" aria-hidden="true" data-testid="mark-key">
        <p className="key-label">{ui.keyLabel}</p>
        <div className="key-items">
          {marksIn(permission).map((kind) => (
            <span key={kind} data-kind={kind}>
              <AuthorityMark kind={kind} size="key" />
              {ui.markKey[kind]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
})
