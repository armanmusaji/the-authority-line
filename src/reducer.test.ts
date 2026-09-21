import { describe, expect, it } from 'vitest'
import {
  canApprove,
  canRedo,
  canUndo,
  currentReport,
  hasPlayed,
  initialState,
  reducer,
  resultMessage,
  revealedSteps,
  stepCount,
  type DialAction,
  type DialState,
} from './reducer'
import { getSetting, type PermissionId } from './scenario'

function run(state: DialState, actions: DialAction[]): DialState {
  return actions.reduce(reducer, state)
}

function select(permission: PermissionId, from: DialState = initialState): DialState {
  return reducer(from, { type: 'setPermission', permission })
}

describe('starting state', () => {
  it('opens on Act alone, with that morning already counted as viewed', () => {
    expect(initialState.permission).toBe('act-alone')
    expect(initialState.viewed).toEqual(['act-alone'])
    expect(initialState.playing).toBe(false)
    expect(initialState.lastPlay).toBe(null)
    expect(hasPlayed(initialState)).toBe(false)
  })

  it('shows every step straight away, with no stepping required', () => {
    expect(revealedSteps(initialState)).toBe(stepCount('act-alone'))
  })
})

describe('selecting a setting shows its outcome at once', () => {
  it('reveals the whole log and the matching report for each setting', () => {
    const ids: PermissionId[] = ['act-alone', 'ask-first', 'flag-only']
    for (const id of ids) {
      const state = select(id)
      expect(revealedSteps(state)).toBe(stepCount(id))
      expect(currentReport(state)).toBe(getSetting(id).report)
      expect(state.playing).toBe(false)
    }
  })

  it('is a no-op when that setting is already selected', () => {
    expect(select('act-alone')).toBe(initialState)
  })
})

describe('viewed settings, for Three mornings', () => {
  it('records each setting the first time it is selected, in order', () => {
    const state = run(initialState, [
      { type: 'setPermission', permission: 'flag-only' },
      { type: 'setPermission', permission: 'ask-first' },
    ])
    expect(state.viewed).toEqual(['act-alone', 'flag-only', 'ask-first'])
  })

  it('does not record a setting twice', () => {
    const state = run(initialState, [
      { type: 'setPermission', permission: 'ask-first' },
      { type: 'setPermission', permission: 'act-alone' },
      { type: 'setPermission', permission: 'ask-first' },
    ])
    expect(state.viewed).toEqual(['act-alone', 'ask-first'])
  })
})

describe('play progress', () => {
  it('reveals one step at a time and finishes with every step shown', () => {
    const total = stepCount('act-alone')
    let state = reducer(initialState, { type: 'startPlay' })
    expect(state.playing).toBe(true)
    expect(revealedSteps(state)).toBe(1)

    for (let i = 2; i <= total; i += 1) {
      state = reducer(state, { type: 'advancePlay' })
      expect(revealedSteps(state)).toBe(i)
    }

    /* Advancing past the last step does nothing. The caller finishes instead. */
    expect(reducer(state, { type: 'advancePlay' })).toBe(state)

    state = reducer(state, { type: 'finishPlay' })
    expect(state.playing).toBe(false)
    expect(state.lastPlay).toBe('timed')
    expect(revealedSteps(state)).toBe(total)
    expect(hasPlayed(state)).toBe(true)
  })

  it('ignores advance and finish when no play is running', () => {
    expect(reducer(initialState, { type: 'advancePlay' })).toBe(initialState)
    expect(reducer(initialState, { type: 'finishPlay' })).toBe(initialState)
  })

  it('the reduced motion path shows everything at once and never runs a play', () => {
    const state = reducer(initialState, { type: 'playAtOnce' })
    expect(state.playing).toBe(false)
    expect(state.playStep).toBe(0)
    expect(state.lastPlay).toBe('at-once')
    expect(revealedSteps(state)).toBe(stepCount('act-alone'))
    expect(hasPlayed(state)).toBe(true)
  })

  it('a play in progress is cleared by changing the setting', () => {
    const playing = run(initialState, [{ type: 'startPlay' }, { type: 'advancePlay' }])
    const switched = reducer(playing, { type: 'setPermission', permission: 'flag-only' })
    expect(switched.playing).toBe(false)
    expect(switched.playStep).toBe(0)
    expect(switched.lastPlay).toBe(null)
  })
})

describe('Act alone and Flag only offer nothing to approve or undo', () => {
  it.each(['act-alone', 'flag-only'] as const)('%s', (id) => {
    const state = select(id)
    expect(canApprove(state)).toBe(false)
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
    expect(reducer(state, { type: 'approve' })).toBe(state)
    expect(reducer(state, { type: 'undoEdit' })).toBe(state)
    expect(reducer(state, { type: 'redoEdit' })).toBe(state)
    expect(currentReport(state).actions).toEqual(['change'])
  })

  it('Flag only never has an edited draft', () => {
    expect(select('flag-only').draftEdited).toBe(false)
  })
})

describe('Ask first, approve', () => {
  it('swaps in the sent report, states it cannot be undone, and closes undo', () => {
    const pending = select('ask-first')
    expect(canApprove(pending)).toBe(true)

    const approved = reducer(pending, { type: 'approve' })
    expect(approved.approved).toBe(true)
    expect(currentReport(approved)).toBe(getSetting('ask-first').reportApproved)
    expect(resultMessage(approved)).toMatch(/cannot be undone/i)
    expect(canApprove(approved)).toBe(false)
    expect(canUndo(approved)).toBe(false)
    expect(canRedo(approved)).toBe(false)
    expect(currentReport(approved).actions).toEqual(['change'])
  })

  it('refuses undo and redo once it has been sent', () => {
    const approved = reducer(select('ask-first'), { type: 'approve' })
    expect(reducer(approved, { type: 'undoEdit' })).toBe(approved)
    expect(reducer(approved, { type: 'redoEdit' })).toBe(approved)
  })
})

describe('Ask first, undo then redo', () => {
  it('restores the original draft, keeps it paused, and offers redo', () => {
    const pending = select('ask-first')
    const undone = reducer(pending, { type: 'undoEdit' })

    expect(undone.draftEdited).toBe(false)
    expect(undone.undone).toBe(true)
    expect(currentReport(undone)).toBe(getSetting('ask-first').reportUndone)
    expect(currentReport(undone).actions).toEqual(['redo'])
    expect(resultMessage(undone)).toMatch(/still paused/i)
    expect(canRedo(undone)).toBe(true)
    expect(canUndo(undone)).toBe(false)
    expect(canApprove(undone)).toBe(false)

    const redone = reducer(undone, { type: 'redoEdit' })
    expect(redone.draftEdited).toBe(true)
    expect(redone.undone).toBe(false)
    expect(redone.lastAction).toBe('redo')
    expect(currentReport(redone)).toBe(getSetting('ask-first').report)
    expect(canApprove(redone)).toBe(true)
    expect(canUndo(redone)).toBe(true)
    expect(canRedo(redone)).toBe(false)
  })

  it('survives a second round trip and stays deterministic', () => {
    const pending = select('ask-first')
    const twice = run(pending, [
      { type: 'undoEdit' },
      { type: 'redoEdit' },
      { type: 'undoEdit' },
      { type: 'redoEdit' },
    ])
    expect({ ...twice, lastAction: null }).toEqual(pending)
  })
})

describe('changing the setting resets approve and undo', () => {
  it('clears an approval', () => {
    const approved = reducer(select('ask-first'), { type: 'approve' })
    const back = reducer(approved, { type: 'setPermission', permission: 'ask-first' })
    expect(back).toBe(approved) // same setting is a no-op

    const away = reducer(approved, { type: 'setPermission', permission: 'act-alone' })
    const returned = reducer(away, { type: 'setPermission', permission: 'ask-first' })
    expect(returned.approved).toBe(false)
    expect(returned.undone).toBe(false)
    expect(returned.lastAction).toBe(null)
    expect(currentReport(returned)).toBe(getSetting('ask-first').report)
  })

  it('clears an undo', () => {
    const undone = reducer(select('ask-first'), { type: 'undoEdit' })
    const away = reducer(undone, { type: 'setPermission', permission: 'flag-only' })
    const returned = reducer(away, { type: 'setPermission', permission: 'ask-first' })
    expect(returned.undone).toBe(false)
    expect(returned.draftEdited).toBe(true)
  })
})

describe('purity', () => {
  it('never mutates the state it is given', () => {
    const before = select('ask-first')
    const snapshot = JSON.parse(JSON.stringify(before))
    reducer(before, { type: 'undoEdit' })
    reducer(before, { type: 'approve' })
    reducer(before, { type: 'startPlay' })
    reducer(before, { type: 'setPermission', permission: 'flag-only' })
    expect(before).toEqual(snapshot)
  })
})
