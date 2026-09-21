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
import { HIGHLIGHT_MS, PHONE_QUERY, PLAY_INTERVAL_MS } from './timing'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'


export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [settingsHighlighted, setSettingsHighlighted] = useState(false)
  /** Bumped by every report action so focus moves to the result line each time. */
  const [focusTick, setFocusTick] = useState(0)
  /** Bumped by a Three mornings card, so focus moves to the report it opened. */
  const [reportFocusTick, setReportFocusTick] = useState(0)
  /** Bumped when a phone visitor taps a setting, so the night below scrolls into view. */
  const [nightScrollTick, setNightScrollTick] = useState(0)
  /** How the last setting change was made. Keyboard changes never scroll the page. */
  const lastInputKind = useRef<'pointer' | 'keyboard'>('pointer')

  const reducedMotion = usePrefersReducedMotion()
  const logRef = useRef<HTMLDivElement>(null)
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  /** True while focus sits on Pause or Next, which vanish when the night ends. */
  const focusInPlaySteps = useRef(false)
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

  /* The only clock in the app, deliberately outside the reducer. It waits while paused. */
  useEffect(() => {
    if (!state.playing || state.paused) return
    const id = window.setTimeout(() => {
      dispatch(state.playStep >= total ? { type: 'finishPlay' } : { type: 'advancePlay' })
    }, PLAY_INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [state.playing, state.paused, state.playStep, total])

  /* Any focus outside Pause and Next clears the flag. */
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null
      if (!target?.closest?.('.play-steps')) focusInPlaySteps.current = false
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  /* When the night ends, Pause and Next go. If focus was on them, hand it back to Play. */
  useEffect(() => {
    if (state.playing) return
    const lost = !document.activeElement || document.activeElement === document.body
    if (focusInPlaySteps.current && lost) playRef.current?.focus()
    focusInPlaySteps.current = false
  }, [state.playing])

  /*
    Phone only: after a tap on a setting, bring the night into view so the change
    is visible. Focus stays on the radio. Runs after render, never on load.
  */
  useEffect(() => {
    if (nightScrollTick === 0) return
    document.getElementById('log-heading')?.scrollIntoView?.({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [nightScrollTick, reducedMotion])

  /* A Three mornings card opens that morning, so focus goes to its report. */
  useEffect(() => {
    if (reportFocusTick === 0) return
    document.getElementById('report-heading')?.focus()
  }, [reportFocusTick])

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

  /* The visible line in the log. Screen readers get the announcement below instead. */
  const playStatus = useMemo(() => {
    if (state.playing && state.paused) return ui.playPausedMessage(setting.label, state.playStep, total)
    if (state.playing) return ui.playProgressMessage(setting.label, state.playStep, total)
    if (state.lastPlay === 'timed') return ui.playFinishedMessage
    if (state.lastPlay === 'at-once') return ui.playAtOnceMessage(setting.label, total)
    return null
  }, [state.playing, state.paused, state.playStep, state.lastPlay, setting.label, total])

  /* What the page's one live region says: the step being played, or the setting just picked. */
  const announcement = useMemo(() => {
    if (state.playing) {
      const step = setting.steps[state.playStep - 1]
      return step ? ui.playStepAnnouncement(step.time, step.title) : ''
    }
    if (state.lastPlay === 'timed') return ui.playFinishedMessage
    if (state.lastPlay === 'at-once') return ui.playAtOnceMessage(setting.label, total)
    if (state.settingChanged) return ui.settingAnnouncement(setting.label, report.pill.text)
    return ''
  }, [state.playing, state.playStep, state.lastPlay, state.settingChanged, setting, total, report])

  const playLabel = state.playing
    ? ui.playButtonProgress(state.playStep, total)
    : hasPlayed(state)
      ? placard.playAgainLabel
      : placard.playLabel

  const handleSelect = useCallback((permission: PermissionId) => {
    dispatch({ type: 'setPermission', permission })
    const phone = window.matchMedia?.(PHONE_QUERY).matches ?? false
    /* Arrowing through the radios must not scroll the focused one off screen. */
    if (phone && lastInputKind.current === 'pointer') setNightScrollTick((tick) => tick + 1)
  }, [])

  const handleInputKind = useCallback((kind: 'pointer' | 'keyboard') => {
    lastInputKind.current = kind
  }, [])

  const handleCardSelect = useCallback((permission: PermissionId) => {
    dispatch({ type: 'setPermission', permission })
    setReportFocusTick((tick) => tick + 1)
  }, [])

  const handlePauseToggle = useCallback(() => {
    dispatch(state.paused ? { type: 'resumePlay' } : { type: 'pausePlay' })
  }, [state.paused])

  const handleNext = useCallback(() => dispatch({ type: 'nextStep' }), [])

  const handlePlayStepsFocus = useCallback(() => {
    focusInPlaySteps.current = true
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
          <Placard
            playLabel={playLabel}
            inProgress={state.playing}
            paused={state.paused}
            onPlay={handlePlay}
            onPauseToggle={handlePauseToggle}
            onNext={handleNext}
            playRef={playRef}
            onControlsFocus={handlePlayStepsFocus}
          />

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
                pill={report.pill}
                highlighted={settingsHighlighted}
                onChange={handleSelect}
                radioRef={radioRef}
                onInputKind={handleInputKind}
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
            onSelect={handleCardSelect}
          />

          {/* The page's one polite live region. */}
          <p className="visually-hidden" role="status">
            {announcement}
          </p>
        </main>

        <footer className="site-foot">
          <p>{footer.text}</p>
        </footer>
      </div>
    </>
  )
}
