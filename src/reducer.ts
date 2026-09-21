/**
 * All behaviour lives in this one pure reducer. No timers, no effects, no
 * randomness. Given the same state and action it always returns the same
 * result, which is what makes the three mornings comparable and the tests short.
 *
 * Play progress is represented here, but the clock that drives it lives in the
 * component, so the reducer stays pure.
 */

import {
  DEFAULT_PERMISSION,
  getSetting,
  type ActionId,
  type PermissionId,
  type Report,
} from './scenario'

/** How a finished play ran, which decides the status line it leaves behind. */
export type PlayMode = 'timed' | 'at-once'

export interface DialState {
  permission: PermissionId
  /** Ask first only: is the agent's edit currently sitting in the draft. */
  draftEdited: boolean
  approved: boolean
  undone: boolean
  /** The action whose result line is showing, if any. */
  lastAction: ActionId | null
  /** Settings the viewer has seen, in the order they first saw them. */
  viewed: PermissionId[]
  /** True while a play is in progress, running or paused. */
  playing: boolean
  /** True while a play in progress is paused. The clock waits, the night stays half told. */
  paused: boolean
  /** How many steps are revealed while playing. 0 when not playing. */
  playStep: number
  /** How the last finished play ran, or null if the night has never been played. */
  lastPlay: PlayMode | null
  /** True right after the viewer picks a setting, so the change can be announced once. */
  settingChanged: boolean
}

export type DialAction =
  | { type: 'setPermission'; permission: PermissionId }
  | { type: 'startPlay' }
  | { type: 'advancePlay' }
  | { type: 'finishPlay' }
  | { type: 'pausePlay' }
  | { type: 'resumePlay' }
  | { type: 'nextStep' }
  | { type: 'playAtOnce' }
  | { type: 'approve' }
  | { type: 'undoEdit' }
  | { type: 'redoEdit' }

/** Act alone and Ask first both put the agent's edit into the draft. Flag only never does. */
function startsWithEditedDraft(permission: PermissionId): boolean {
  return permission !== 'flag-only'
}

export const initialState: DialState = {
  permission: DEFAULT_PERMISSION,
  draftEdited: startsWithEditedDraft(DEFAULT_PERMISSION),
  approved: false,
  undone: false,
  lastAction: null,
  viewed: [DEFAULT_PERMISSION],
  playing: false,
  paused: false,
  playStep: 0,
  lastPlay: null,
  settingChanged: false,
}

export function stepCount(permission: PermissionId): number {
  return getSetting(permission).steps.length
}

/** How many steps are visible right now. All of them unless a play is running. */
export function revealedSteps(state: DialState): number {
  return state.playing ? state.playStep : stepCount(state.permission)
}

export function hasPlayed(state: DialState): boolean {
  return state.playing || state.lastPlay !== null
}

/** Approve and undo exist only under Ask first, and only while nothing has been sent. */
export function canApprove(state: DialState): boolean {
  return state.permission === 'ask-first' && state.draftEdited && !state.approved
}

export function canUndo(state: DialState): boolean {
  return state.permission === 'ask-first' && state.draftEdited && !state.approved
}

export function canRedo(state: DialState): boolean {
  return state.permission === 'ask-first' && state.undone && !state.approved
}

/** Which of a setting's reports the current state is showing. */
export function currentReport(state: DialState): Report {
  const setting = getSetting(state.permission)
  if (state.permission === 'ask-first') {
    if (state.approved && setting.reportApproved) return setting.reportApproved
    if (state.undone && setting.reportUndone) return setting.reportUndone
  }
  return setting.report
}

/** The result line to show, if the last action left one. */
export function resultMessage(state: DialState): string | null {
  if (state.lastAction === null) return null
  if (state.lastAction === 'redo') return null // supplied by the caller, see ui.redoneMessage
  return currentReport(state).resultMessage ?? null
}

function addViewed(viewed: PermissionId[], permission: PermissionId): PermissionId[] {
  return viewed.includes(permission) ? viewed : [...viewed, permission]
}

export function reducer(state: DialState, action: DialAction): DialState {
  switch (action.type) {
    /**
     * Selecting a setting shows its whole night and its morning at once.
     * It also clears any play in progress and any Ask first approve or undo.
     */
    case 'setPermission': {
      if (action.permission === state.permission) return state
      return {
        permission: action.permission,
        draftEdited: startsWithEditedDraft(action.permission),
        approved: false,
        undone: false,
        lastAction: null,
        viewed: addViewed(state.viewed, action.permission),
        playing: false,
        paused: false,
        playStep: 0,
        lastPlay: null,
        settingChanged: true,
      }
    }

    case 'startPlay':
      return { ...state, playing: true, paused: false, playStep: 1, lastPlay: null, settingChanged: false }

    /** The clock's step. It never moves a paused night. */
    case 'advancePlay': {
      if (!state.playing || state.paused) return state
      const next = Math.min(state.playStep + 1, stepCount(state.permission))
      if (next === state.playStep) return state
      return { ...state, playStep: next }
    }

    case 'finishPlay': {
      if (!state.playing) return state
      return { ...state, playing: false, paused: false, playStep: 0, lastPlay: 'timed' }
    }

    case 'pausePlay': {
      if (!state.playing || state.paused) return state
      return { ...state, paused: true }
    }

    case 'resumePlay': {
      if (!state.playing || !state.paused) return state
      return { ...state, paused: false }
    }

    /** The viewer's step, paused or not. Past the last step it ends the night. */
    case 'nextStep': {
      if (!state.playing) return state
      if (state.playStep >= stepCount(state.permission)) {
        return { ...state, playing: false, paused: false, playStep: 0, lastPlay: 'timed' }
      }
      return { ...state, playStep: state.playStep + 1 }
    }

    /** The reduced motion path: no timed reveal, every step at once. */
    case 'playAtOnce':
      return { ...state, playing: false, paused: false, playStep: 0, lastPlay: 'at-once', settingChanged: false }

    case 'approve': {
      if (!canApprove(state)) return state
      return { ...state, approved: true, lastAction: 'approve', settingChanged: false }
    }

    /** Undo restores the original draft. The campaign stays paused either way. */
    case 'undoEdit': {
      if (!canUndo(state)) return state
      return { ...state, draftEdited: false, undone: true, lastAction: 'undo', settingChanged: false }
    }

    case 'redoEdit': {
      if (!canRedo(state)) return state
      return { ...state, draftEdited: true, undone: false, lastAction: 'redo', settingChanged: false }
    }

    default:
      return state
  }
}
