import { forwardRef } from 'react'
import { SectionHead, StatusPill } from './Marks'
import { product, ui, type ActionId, type Report } from './scenario'

interface Props {
  report: Report
  /** True while the night is playing. The report ghosts out until 8:40. */
  waiting: boolean
  resultMessage: string | null
  onAction: (action: ActionId) => void
}

/**
 * The morning report, its own cool-tinted section. While the night plays it
 * stays in place and ghosts out rather than unmounting, so the column does not
 * jump. Meanwhile its content is hidden from screen readers and its buttons
 * are disabled, because it is still night.
 */
export const MorningReport = forwardRef<HTMLParagraphElement, Props>(function MorningReport(
  { report, waiting, resultMessage, onAction },
  resultRef,
) {
  return (
    <div className="report-section">
      <SectionHead id="report-heading" number={3} focusable>
        {product.reportHeading}
      </SectionHead>

      <div className={waiting ? 'morning waiting' : 'morning'}>
        {waiting && <p className="wait">{ui.waitingText}</p>}

        <div className="morning-body" aria-hidden={waiting || undefined}>
          <StatusPill pill={report.pill} />
          <h4 className="report-head">{report.heading}</h4>

          <dl className="facts">
            {report.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="diff">
            {report.diff.map((panel) => (
              <div key={panel.label}>
                <span className="lbl">{panel.label}</span>
                {panel.value}
              </div>
            ))}
          </div>

          {/* The only warm accent in the product. Warm means cost. */}
          <p className="cost">{report.cost}</p>

          <div className="actions">
            {report.actions.map((action) => (
              <button
                type="button"
                key={action}
                className={action === 'approve' ? 'btn' : 'btn ghost'}
                disabled={waiting}
                onClick={() => onAction(action)}
              >
                {ui.actionLabels[action]}
              </button>
            ))}
          </div>

          {/* Focus moves here after every action, which is how it gets announced. */}
          {resultMessage && (
            <p className="result" tabIndex={-1} ref={resultRef}>
              {resultMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})
