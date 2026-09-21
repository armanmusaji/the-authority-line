/**
 * All scenario content lives here. Components read from this file and hold no
 * copy of their own, so a copy change never means touching a component.
 *
 * Everything below is fictional. The brand does not exist, the agent is
 * simulated, and every number is invented for the demonstration.
 *
 * Layout follows ../../assets/layout-mockup-v4.html. Look, marks, the authority
 * line and pill copy follow ../../assets/visual-direction-v4.html.
 */

export type PermissionId = 'act-alone' | 'ask-first' | 'flag-only'

export const PERMISSION_IDS: PermissionId[] = ['act-alone', 'ask-first', 'flag-only']

/**
 * The mark beside each step. Squares mean the agent: solid acted within its
 * authority, empty needs your approval, struck is outside its authority.
 * Pictograms mean not the agent: a clock for the schedule, a person for you.
 * Marks are decoration. The authority text beside each one says the same thing.
 */
export type MarkKind = 'within' | 'needs-approval' | 'outside' | 'schedule' | 'human'

export const MARK_ORDER: MarkKind[] = ['within', 'needs-approval', 'outside', 'schedule', 'human']

/** Every button the morning report can offer. */
export type ActionId = 'approve' | 'undo' | 'redo' | 'change'

/** Pills describe what happened to the email, never a verdict on the setting. */
export type PillKind = 'ok' | 'wait' | 'bad'

export interface LogStep {
  id: string
  time: string
  title: string
  mark: MarkKind
  /** Read after the mark's prefix, for example "Within its authority: pause a queued send". */
  authority: string
}

export interface Fact {
  label: string
  value: string
}

export interface DiffPanel {
  label: string
  value: string
}

export interface Pill {
  kind: PillKind
  /** Shown beside the words and hidden from screen readers, which read the words. */
  symbol: string
  text: string
}

export interface Report {
  pill: Pill
  heading: string
  facts: Fact[]
  diff: DiffPanel[]
  cost: string
  actions: ActionId[]
  /** Written into the result line and focused after the action that caused it. */
  resultMessage?: string
}

export interface Setting {
  id: PermissionId
  label: string
  /** The radio's accessible description. Short, because cost lives in the report. */
  description: string
  /** One line for the Three mornings card, once this setting has been viewed. */
  summary: string
  steps: LogStep[]
  /** The authority line is drawn before the step at this index. */
  limitIndex: number
  limitLabel: string
  report: Report
  /** Ask first only: the report after Approve, and the report after Undo. */
  reportApproved?: Report
  reportUndone?: Report
}

export const placard = {
  title: 'The Authority Line',
  /** Set in capitals by CSS, so a screen reader does not spell it out. */
  byline: 'A design concept by Arman Musaji · Fictional brand, simulated agent',
  lede: "A tea company's email is queued for 6:00 AM. At 2:14 AM its AI agent notices the discount code expired at midnight. The marketer is asleep until 8:40. What should the agent be allowed to do?",
  ask: 'Same problem. Three settings. Three different mornings. Try all three.',
  /* Phone only: the same situation in one sentence, and the task on its own. */
  ledeShort:
    "At 2:14 AM, an AI agent finds that the discount code in a tea company's 6:00 AM email has expired, and the marketer is asleep until 8:40.",
  askShort: 'Try all three.',
  guideLabel: 'How to read this',
  guide: [
    'Set how far the agent may go.',
    'Read the night. The line shows where its authority ended.',
    'See the morning you woke up to, and what it cost.',
  ],
  playLabel: 'Play the night',
  playAgainLabel: 'Play the night again',
  playNote: "Optional. Watch the agent's night step by step.",
  tagline: "Below: the marketer's own tool",
}

export const product = {
  wordmark: 'Halfmoon Tea',
  breadcrumb: 'Campaigns · Autumn Restock · Agent',
  settingsHeading: 'Agent settings',
  legend: 'When a queued campaign has a broken offer, the agent may:',
  logHeading: 'Overnight',
  reportHeading: 'Morning report, 8:40 AM',
  /* The one rule no setting changes. Shown after the three options, never as a fourth. */
  offLimitsHeading: 'Whatever you choose above, one thing stays off limits.',
  offLimitsBody:
    'The agent can never create or change a discount. It can only use offers your team has already approved.',
}

export const mornings = {
  heading: 'Three mornings, as of 8:40 AM',
  emptyText: 'Not tried yet. Select to see this morning.',
  /** Announced to a screen reader so "tried" is not carried by the card's look alone. */
  viewedStateLabel: 'Viewed',
  emptyStateLabel: 'Not tried yet',
}

export const footer = {
  text: 'Self-initiated concept by Arman Musaji. Fictional brand, simulated agent and data.',
}

export const ui = {
  skipLinkLabel: 'Skip to main content',
  mainLabel: 'The Authority Line',
  actionLabels: {
    approve: 'Approve and send now',
    undo: 'Undo the edit',
    redo: 'Redo the edit',
    change: 'Change this setting',
  } satisfies Record<ActionId, string>,
  redoneMessage: 'Edit restored. The fix is proposed again. Still paused.',
  waitingText: 'It is still night. The report appears at 8:40 AM.',
  playButtonProgress: (step: number, total: number) =>
    `Playing the night… step ${step} of ${total}`,
  playProgressMessage: (settingLabel: string, step: number, total: number) =>
    `Playing with ${settingLabel}. Step ${step} of ${total}.`,
  playFinishedMessage: 'Night over. It is 8:40 AM. The morning report below is ready.',
  playPausedMessage: (settingLabel: string, step: number, total: number) =>
    `Paused with ${settingLabel}, at step ${step} of ${total}.`,
  /* Spoken while the night plays: the action, not a step number. */
  playStepAnnouncement: (time: string, title: string) => `${time}. ${title}.`,
  /* Spoken once when the setting changes. */
  settingAnnouncement: (settingLabel: string, pillText: string) => `${settingLabel}. ${pillText}.`,
  pauseLabel: 'Pause',
  resumeLabel: 'Resume',
  nextLabel: 'Next',
  playAtOnceMessage: (settingLabel: string, total: number) =>
    `Night played with ${settingLabel}. All ${total} steps shown at once because reduced motion is on.`,
  /** Read by a screen reader so step state is never only a colour or an opacity. */
  stepStateLabel: {
    now: 'Current step. ',
    future: 'Not yet reached. ',
    past: '',
  },
  /** Spoken before each step's authority text. */
  markPrefix: {
    within: 'Within its authority',
    'needs-approval': 'Needs your approval',
    outside: 'Outside its authority',
    schedule: 'Not the agent',
    human: 'You',
  } satisfies Record<MarkKind, string>,
  /** The key under the log, listing only the marks in the current night. */
  markKey: {
    within: 'Agent did it',
    'needs-approval': 'Waiting for you',
    outside: 'Agent not allowed',
    schedule: 'The schedule, not the agent',
    human: 'You',
  } satisfies Record<MarkKind, string>,
}

/** Every position sees the same first two steps, so they are written once. */
const findsTheCode: LogStep = {
  id: 'detect',
  time: '2:14 AM',
  title: 'Finds the expired code',
  mark: 'within',
  authority: 'check a queued campaign',
}

const pauses: LogStep = {
  id: 'pause',
  time: '2:14 AM',
  title: 'Pauses the launch',
  mark: 'within',
  authority: 'pause a queued send',
}

const pillSentOnTime: Pill = { kind: 'ok', symbol: '✓', text: 'Sent on time' }
const pillPaused: Pill = { kind: 'wait', symbol: 'Ⅱ', text: 'Paused, waiting for you' }
const pillDeadCode: Pill = { kind: 'bad', symbol: '✕', text: 'Sent with a dead code' }

const askFacts: Fact[] = [
  { label: 'Status', value: 'Paused. Not sent.' },
  { label: 'Was due', value: '6:00 AM to 12,480 subscribers (simulated)' },
  { label: 'Delay', value: '2 h 40 min and counting' },
]

const askCost = 'Safe, but the launch is late. That is the price of being asked.'

export const settings: Setting[] = [
  {
    id: 'act-alone',
    label: 'Act alone',
    description: 'Fix it with an approved offer and send on time.',
    summary: 'Fixed and sent on time. Nobody asked you.',
    steps: [
      findsTheCode,
      pauses,
      {
        id: 'swap',
        time: '2:15 AM',
        title: 'Swaps in the approved offer',
        mark: 'within',
        authority: 'use an approved offer',
      },
      {
        id: 'send',
        time: '6:00 AM',
        title: 'Sends on schedule',
        mark: 'within',
        authority: 'send at the scheduled time',
      },
      {
        id: 'return',
        time: '8:40 AM',
        title: 'You get back',
        mark: 'human',
        authority: 'read the receipt',
      },
    ],
    limitIndex: 4,
    limitLabel: "The agent's authority ended here. It finished the job.",
    report: {
      pill: pillSentOnTime,
      heading: 'It shipped. Here is the receipt.',
      facts: [
        { label: 'Sent', value: '6:00 AM, on schedule, to 12,480 subscribers (simulated)' },
        { label: 'Changed by', value: 'The agent, alone' },
        { label: 'Delay', value: 'None' },
      ],
      diff: [
        { label: 'Before', value: 'FALL20 · 20% off · expired' },
        { label: 'Sent', value: 'Free shipping over $40 · approved' },
      ],
      cost: 'You were not asked. A send cannot be undone.',
      actions: ['change'],
    },
  },
  {
    id: 'ask-first',
    label: 'Ask first',
    description: 'Pause, prepare the fix, wait for me.',
    summary: 'Safe and ready for one click. Launch is 2 h 40 min late.',
    steps: [
      findsTheCode,
      pauses,
      {
        id: 'draft',
        time: '2:15 AM',
        title: 'Prepares the fix as a draft',
        mark: 'needs-approval',
        authority: 'change what a campaign sends',
      },
      {
        id: 'hold',
        time: '6:00 AM',
        title: 'Holds. Nothing sends.',
        mark: 'needs-approval',
        authority: 'still waiting for you',
      },
      {
        id: 'return',
        time: '8:40 AM',
        title: 'You get back',
        mark: 'human',
        authority: 'approve, undo, or leave paused',
      },
    ],
    /* After the draft: preparing the fix was allowed, sending it was not. */
    limitIndex: 3,
    limitLabel: 'Its authority ended here. It could prepare the fix. It could not send it.',
    report: {
      pill: pillPaused,
      heading: 'Nothing went out. The decision is yours.',
      facts: askFacts,
      diff: [
        { label: 'Now', value: 'FALL20 · 20% off · expired' },
        { label: 'Proposed', value: 'Free shipping over $40 · approved' },
      ],
      cost: askCost,
      actions: ['approve', 'undo'],
    },
    /* The email went out with a working offer, so the pill is green. The words say it was late. */
    reportApproved: {
      pill: { kind: 'ok', symbol: '✓', text: 'Sent at 8:41 AM, 2 h 41 min late' },
      heading: 'Approved. It is out, with the working offer.',
      facts: [
        { label: 'Status', value: 'Sent.' },
        { label: 'Sent', value: '8:41 AM, to 12,480 subscribers (simulated)' },
        { label: 'Delay', value: '2 h 41 min' },
      ],
      diff: [
        { label: 'Before', value: 'FALL20 · 20% off · expired' },
        { label: 'Sent', value: 'Free shipping over $40 · approved' },
      ],
      cost: 'Safe, and late. That is the price of being asked.',
      actions: ['change'],
      resultMessage: 'Sent. This cannot be undone. Undo only ever applied to the draft.',
    },
    reportUndone: {
      pill: { kind: 'wait', symbol: 'Ⅱ', text: 'Paused, edit removed' },
      heading: 'Nothing went out. The decision is yours.',
      facts: askFacts,
      diff: [
        { label: 'Now', value: 'FALL20 · 20% off · expired' },
        { label: 'Proposed', value: "Nothing. You removed the agent's edit." },
      ],
      cost: askCost,
      actions: ['redo'],
      resultMessage: 'Edit undone. The campaign is still paused. Nothing has been sent.',
    },
  },
  {
    id: 'flag-only',
    label: 'Flag only',
    description: 'Alert me. Touch nothing.',
    summary: 'You were told. You were asleep. It went out broken.',
    steps: [
      findsTheCode,
      {
        id: 'alert',
        time: '2:14 AM',
        title: 'Sends you an alert',
        mark: 'within',
        authority: 'tell you what it found',
      },
      {
        id: 'stands-down',
        time: '2:15 AM',
        title: 'Stands down',
        mark: 'outside',
        authority: 'touch the campaign',
      },
      {
        id: 'send',
        time: '6:00 AM',
        title: 'The campaign sends itself',
        mark: 'schedule',
        authority: 'the schedule ran, nothing stopped it',
      },
      {
        id: 'return',
        time: '8:40 AM',
        title: 'You get back',
        mark: 'human',
        authority: 'find out six hours late',
      },
    ],
    limitIndex: 2,
    limitLabel: "The agent's authority ended here. It may only tell you.",
    report: {
      pill: pillDeadCode,
      heading: 'One unread alert. One broken send.',
      facts: [
        { label: 'Alert', value: '2:14 AM, unread until 8:40' },
        { label: 'Sent', value: '6:00 AM with FALL20, to 12,480 subscribers (simulated)' },
        { label: 'Delay', value: 'None. That is the problem.' },
      ],
      diff: [
        { label: 'Sent', value: 'FALL20 · 20% off · expired' },
        { label: 'Readers saw', value: 'A code that fails at checkout' },
      ],
      cost: 'You kept control on paper. The email went out broken and cannot be undone.',
      actions: ['change'],
    },
  },
]

export function getSetting(id: PermissionId): Setting {
  const found = settings.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown setting: ${id}`)
  return found
}

/** The marks that appear in a setting's night, in key order, each listed once. */
export function marksIn(id: PermissionId): MarkKind[] {
  const used = new Set(getSetting(id).steps.map((step) => step.mark))
  return MARK_ORDER.filter((kind) => used.has(kind))
}

export const DEFAULT_PERMISSION: PermissionId = 'act-alone'
