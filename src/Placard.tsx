import { placard } from './scenario'

interface Props {
  playLabel: string
  playing: boolean
  onPlay: () => void
}

/** Arman's voice, speaking to the visitor. Serif, on the page ground, outside the product. */
export function Placard({ playLabel, playing, onPlay }: Props) {
  return (
    <section className="plac" aria-labelledby="placard-title">
      <div className="plac-main">
        <h1 id="placard-title">{placard.title}</h1>
        <p className="plac-by">{placard.byline}</p>
        <p className="plac-lede">{placard.lede}</p>
        <p className="plac-ask">{placard.ask}</p>
        <div className="plac-controls">
          <button
            type="button"
            className="play"
            onClick={onPlay}
            aria-busy={playing || undefined}
            aria-describedby="play-note"
          >
            {playLabel}
          </button>
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
