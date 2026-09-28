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

/** The replay control, a feature of the marketer's tool. Lives in the product bar; no author voice. */
export function PlayControls({
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
    <div className="play-controls">
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

      <span className="play-note" id="play-note">
        {placard.playNote}
      </span>
    </div>
  )
}
