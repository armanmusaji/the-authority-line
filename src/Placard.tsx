import type { Ref } from 'react'
import { placard, ui } from './scenario'

interface Props {
  playLabel: string
  /** True while a play is in progress, running or paused. Shows Pause and Next. */
  inProgress: boolean
  paused: boolean
  onPlay: () => void
  onPauseToggle: () => void
  onNext: () => void
  playRef: Ref<HTMLButtonElement>
  /** Marks the moment focus sits on Pause or Next, so it can be caught when they go. */
  onControlsFocus: () => void
}

/** Arman's voice, speaking to the visitor. Serif, on the page ground, outside the product. */
export function Placard({
  playLabel,
  inProgress,
  paused,
  onPlay,
  onPauseToggle,
  onNext,
  playRef,
  onControlsFocus,
}: Props) {
  return (
    <section className="plac" aria-labelledby="placard-title">
      <div className="plac-main">
        <h1 id="placard-title">{placard.title}</h1>
        <p className="plac-by">{placard.byline}</p>

        {/* Desktop tells the whole situation. Phone keeps one sentence and the task. */}
        <p className="plac-lede plac-long">{placard.lede}</p>
        <p className="plac-lede plac-short">{placard.ledeShort}</p>
        <p className="plac-ask plac-long">{placard.ask}</p>
        <p className="plac-ask plac-short">{placard.askShort}</p>

        <div className="plac-controls">
          <button
            type="button"
            className="play"
            ref={playRef}
            onClick={onPlay}
            aria-busy={(inProgress && !paused) || undefined}
            aria-describedby="play-note"
          >
            {playLabel}
          </button>

          {inProgress && (
            <span className="play-steps" onFocus={onControlsFocus}>
              <button type="button" className="play-step" onClick={onPauseToggle}>
                {paused ? ui.resumeLabel : ui.pauseLabel}
              </button>
              <button type="button" className="play-step" onClick={onNext}>
                {ui.nextLabel}
              </button>
            </span>
          )}

          <span className="plac-note" id="play-note">
            {placard.playNote}
          </span>
        </div>
      </div>

      <ol className="guide" aria-label={placard.guideLabel}>
        {placard.guide.map((line, index) => (
          <li key={line}>
            <span className="num" aria-hidden="true">
              {index + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
