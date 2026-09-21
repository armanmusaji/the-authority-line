import { useCallback, useEffect, useMemo, useRef, useReducer, useState } from 'react'
import { ActivityLog } from './ActivityLog'
import { MorningReport } from './MorningReport'
import { Placard } from './Placard'
import { SettingsPane } from './SettingsPane'
import { ThreeMornings } from './ThreeMornings'
import {
  footer,
  getSetting,
  placard,
  product,
  ui,
  type ActionId,
  type PermissionId,
} from './scenario'
import {
  currentReport,
  hasPlayed,
  initialState,
  reducer,
  resultMessage,
  revealedSteps,
  stepCount,
} from './reducer'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** The mockup's cadence: slow enough to read, quick enough to sit through. */
const PLAY_INTERVAL_MS = 1300
/** How long the settings group stays outlined after "Change this setting". */
const HIGHLIGHT_MS = 1800

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [settingsHighlighted, setSettingsHighlighted] = useState(false)
  /** Bumped by every report action so focus moves to the result line each time. */
  const [focusTick, setFocusTick] = useState(0)

  const reducedMotion = usePrefersReducedMotion()
  const logRef = useRef<HTMLDivElement>(null)
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const radios = useRef(new Map<PermissionId, HTMLInputElement | null>())

  const setting = getSetting(state.permission)
  const total = stepCount(state.permission)
  const report = currentReport(state)

  const radioRef = useCallback(
    (id: PermissionId) => (node: HTMLInputElement | null) => {
      radios.current.set(id, node)
    },
    [],
  )

  /* The only clock in the app, deliberately outside the reducer. */
  useEffect(() => {
    if (!state.playing) return
    const id = window.setTimeout(() => {
      dispatch(state.playStep >= total ? { type: 'finishPlay' } : { type: 'advancePlay' })
    }, PLAY_INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [state.playing, state.playStep, total])

  /* Required: after Approve, Undo, Redo the focus lands on the result line. */
  useEffect(() => {
    if (focusTick === 0) return
    resultRef.current?.focus({ preventScroll: true })
  }, [focusTick])

  useEffect(() => {
    if (!settingsHighlighted) return
    const id = window.setTimeout(() => setSettingsHighlighted(false), HIGHLIGHT_MS)
    return () => window.clearTimeout(id)
  }, [settingsHighlighted])

  const message = useMemo(() => {
    if (state.lastAction === 'redo') return ui.redoneMessage
    return resultMessage(state)
  }, [state])

  const playStatus = useMemo(() => {
    if (state.playing) return ui.playProgressMessage(setting.label, state.playStep, total)
    if (state.lastPlay === 'timed') return ui.playFinishedMessage
    if (state.lastPlay === 'at-once') return ui.playAtOnceMessage(setting.label, total)
    return null
  }, [state.playing, state.playStep, state.lastPlay, setting.label, total])

  const playLabel = state.playing
    ? ui.playButtonProgress(state.playStep, total)
    : hasPlayed(state)
      ? placard.playAgainLabel
      : placard.playLabel

  const handleSelect = useCallback((permission: PermissionId) => {
    dispatch({ type: 'setPermission', permission })
  }, [])

  const handlePlay = useCallback(() => {
    /* scrollIntoView is missing in jsdom, so the call is optional. */
    logRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
    logRef.current?.focus({ preventScroll: true })
    dispatch(reducedMotion ? { type: 'playAtOnce' } : { type: 'startPlay' })
  }, [reducedMotion])

  const handleAction = useCallback((action: ActionId) => {
    if (action === 'change') {
      setSettingsHighlighted(true)
      fieldsetRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
      return
    }
    dispatch(
      action === 'approve'
        ? { type: 'approve' }
        : action === 'undo'
          ? { type: 'undoEdit' }
          : { type: 'redoEdit' },
    )
    setFocusTick((tick) => tick + 1)
  }, [])

  /* "Change this setting" hands control back to the left column. */
  useEffect(() => {
    if (!settingsHighlighted) return
    radios.current.get(state.permission)?.focus({ preventScroll: true })
  }, [settingsHighlighted, state.permission])

  return (
    <>
      <a className="skip-link" href="#main">
        {ui.skipLinkLabel}
      </a>

      <div className="page">
        <main id="main" aria-label={ui.mainLabel}>
          <Placard playLabel={playLabel} playing={state.playing} onPlay={handlePlay} />

          <p className="tagline">{placard.tagline}</p>

          <section className="frame" aria-labelledby="product-title">
            <div className="bar">
              <h2 className="wm" id="product-title">
                <span className="moon" aria-hidden="true" />
                {product.wordmark}
              </h2>
              <p className="crumb">{product.breadcrumb}</p>
            </div>

            <div className="panes">
              <SettingsPane
                ref={fieldsetRef}
                value={state.permission}
                highlighted={settingsHighlighted}
                onChange={handleSelect}
                radioRef={radioRef}
              />

              <div className="pane right">
                <ActivityLog
                  ref={logRef}
                  permission={state.permission}
                  revealed={revealedSteps(state)}
                  playing={state.playing}
                  status={playStatus}
                />
                <MorningReport
                  ref={resultRef}
                  report={report}
                  waiting={state.playing}
                  resultMessage={message}
                  onAction={handleAction}
                />
              </div>
            </div>
          </section>

          <ThreeMornings
            current={state.permission}
            viewed={state.viewed}
            onSelect={handleSelect}
          />
        </main>

        <footer className="site-foot">
          <p>{footer.text}</p>
        </footer>
      </div>
    </>
  )
}
