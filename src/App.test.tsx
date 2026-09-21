import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { PLAY_INTERVAL_MS } from './timing'
import indexHtml from '../index.html?raw'
import { footer, getSetting, marksIn, mornings, placard, product, settings, ui } from './scenario'
import { stepCount } from './reducer'

const ACT = getSetting('act-alone')
const ASK = getSetting('ask-first')
const FLAG = getSetting('flag-only')

function setReducedMotion(reduce: boolean, phone = false) {
  window.matchMedia = ((query: string) => ({
    matches:
      (reduce && query.includes('prefers-reduced-motion')) ||
      (phone && query.includes('max-width: 760px')),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => setReducedMotion(false))

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const selectSetting = async (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(screen.getByRole('radio', { name: label }))

describe('the three layers of the approved layout', () => {
  it('renders the placard, the product frame and Three mornings', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: placard.title })).toBeInTheDocument()
    expect(screen.getByText(placard.ask)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: placard.playLabel })).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: product.wordmark })).toBeInTheDocument()
    expect(screen.getByText(product.breadcrumb)).toBeInTheDocument()
    expect(screen.getByText(placard.tagline)).toBeInTheDocument()
    /* The section numbers are decoration, so each heading is named by its words alone. */
    expect(screen.getByRole('heading', { level: 3, name: product.settingsHeading })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: product.logHeading })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: product.reportHeading })).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { level: 2, name: mornings.heading }),
    ).toBeInTheDocument()
    expect(screen.getByText(footer.text)).toBeInTheDocument()
  })

  it('shows the off-limits rule in the approved words', () => {
    render(<App />)
    expect(screen.getByText('Whatever you choose above, one thing stays off limits.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The agent can never create or change a discount. It can only use offers your team has already approved.',
      ),
    ).toBeInTheDocument()
  })

  it('puts the off-limits rule outside the radio group, straight after the three options', () => {
    render(<App />)
    const rule = screen.getByText(product.offLimitsHeading).closest('.never') as HTMLElement
    const fieldset = document.querySelector('fieldset.settings') as HTMLElement
    const radios = screen.getAllByRole('radio')

    expect(radios).toHaveLength(3)
    expect(fieldset).not.toContainElement(rule)
    expect(fieldset.nextElementSibling).toBe(rule)
    /* In reading order, a screen reader meets it right after the last option. */
    expect(radios[2].compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rule).toContainElement(screen.getByText(product.offLimitsBody))
  })

  it('keeps the off-limits rule inert, marked with the struck square and no padlock', () => {
    render(<App />)
    const rule = screen.getByText(product.offLimitsHeading).closest('.never') as HTMLElement

    expect(rule.querySelectorAll('button, input, select, a, [tabindex], [role]')).toHaveLength(0)
    /* Bold text, not a heading element. */
    expect(within(rule).queryByRole('heading')).toBeNull()

    const marks = rule.querySelectorAll('.mark')
    expect(marks).toHaveLength(1)
    expect(marks[0]).toHaveAttribute('data-kind', 'outside')
    expect(marks[0]).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('.lock')).toBeNull()
  })

  it('shows selection as the knob and the card only, with no SET label', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const setting of settings) {
      await selectSetting(user, setting.label)
      expect(screen.queryByText('SET')).toBeNull()
      expect(document.querySelector('.set')).toBeNull()
    }
  })

  it('has no Step back, Step forward or autoplay control', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /step (back|forward)/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

describe('the radio group', () => {
  it('names each radio by its position only, with the explanation as description', () => {
    render(<App />)
    for (const setting of settings) {
      const radio = screen.getByRole('radio', { name: setting.label })
      expect(radio).toHaveAccessibleName(setting.label)
      expect(radio).toHaveAccessibleDescription(setting.description)
    }
  })
})

describe('selecting a setting shows its outcome at once', () => {
  it('needs no stepping to see the log and the report', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(ACT.report.heading)).toBeInTheDocument()
    expect(document.querySelectorAll('li.step')).toHaveLength(stepCount('act-alone'))

    await selectSetting(user, 'Flag only')
    expect(screen.getByText(FLAG.report.heading)).toBeInTheDocument()
    expect(screen.getByText(FLAG.report.cost)).toBeInTheDocument()
    expect(screen.getByText(FLAG.steps[2].title)).toBeInTheDocument()

    await selectSetting(user, 'Ask first')
    expect(screen.getByText(ASK.report.heading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ui.actionLabels.approve })).toBeInTheDocument()
  })

  it('puts the cost in the report, not in the radio options', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    const radio = screen.getByRole('radio', { name: 'Ask first' })
    expect(radio).not.toHaveAccessibleDescription(new RegExp(escapeRegExp(ASK.report.cost)))
    expect(screen.getByText(ASK.report.cost)).toBeInTheDocument()
  })
})

describe('Three mornings', () => {
  it('fills a card in only after that setting has been viewed, and selects on click', async () => {
    const user = userEvent.setup()
    render(<App />)

    const cardFor = (label: string) =>
      screen.getByRole('button', { name: new RegExp(`^${label}`) })

    expect(cardFor('Act alone')).toHaveTextContent(ACT.summary)
    expect(cardFor('Ask first')).toHaveTextContent(mornings.emptyText)
    expect(cardFor('Flag only')).toHaveTextContent(mornings.emptyText)

    await user.click(cardFor('Ask first'))
    expect(screen.getByRole('radio', { name: 'Ask first' })).toBeChecked()
    expect(cardFor('Ask first')).toHaveTextContent(ASK.summary)
    expect(cardFor('Ask first')).toHaveAttribute('aria-current', 'true')

    await selectSetting(user, 'Flag only')
    expect(cardFor('Flag only')).toHaveTextContent(FLAG.summary)
    /* All three filled in is the comparison the piece exists to make. */
    for (const setting of settings) {
      expect(cardFor(setting.label)).toHaveTextContent(setting.summary)
    }
  })
})

describe('Play the night', () => {
  it('shows progress, outlines the log, holds the report, then hands it back', async () => {
    vi.useFakeTimers()
    render(<App />)
    const total = stepCount('act-alone')

    fireEvent.click(screen.getByRole('button', { name: placard.playLabel }))

    const play = screen.getByRole('button', { name: ui.playButtonProgress(1, total) })
    expect(play).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(
      ui.playStepAnnouncement(ACT.steps[0].time, ACT.steps[0].title),
    )
    expect(document.querySelector('.log-status')).toHaveTextContent(
      ui.playProgressMessage(ACT.label, 1, total),
    )
    expect(document.querySelector('.log')).toHaveClass('live')
    expect(screen.getByText(ui.waitingText)).toBeInTheDocument()
    /* It is still night: the report is hidden from screen readers and its buttons are off. */
    expect(document.querySelector('.morning-body')).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.getByRole('button', { name: ui.actionLabels.change, hidden: true }),
    ).toBeDisabled()

    /* One step is current, the rest are still ahead. */
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    expect(document.querySelectorAll('li.step.future')).toHaveLength(total - 1)

    await tick()
    expect(screen.getByRole('button', { name: ui.playButtonProgress(2, total) })).toBeInTheDocument()
    expect(document.querySelectorAll('li.step.future')).toHaveLength(total - 2)

    await tick(total - 1)
    expect(screen.getByRole('button', { name: placard.playAgainLabel })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(ui.playFinishedMessage)
    expect(document.querySelector('.log')).not.toHaveClass('live')
    expect(screen.queryByText(ui.waitingText)).not.toBeInTheDocument()
    expect(document.querySelectorAll('li.step.future')).toHaveLength(0)
    expect(screen.getByText(ACT.report.heading)).toBeInTheDocument()
  })

  it('under reduced motion shows every step at once and says why', async () => {
    setReducedMotion(true)
    const user = userEvent.setup()
    render(<App />)
    const total = stepCount('act-alone')

    await user.click(screen.getByRole('button', { name: placard.playLabel }))

    expect(screen.getByRole('status')).toHaveTextContent(ui.playAtOnceMessage(ACT.label, total))
    expect(document.querySelectorAll('li.step.future')).toHaveLength(0)
    expect(screen.queryByText(ui.waitingText)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: placard.playAgainLabel })).not.toHaveAttribute(
      'aria-busy',
    )
  })

  it('uses exactly one polite live region', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: placard.playLabel }))
    expect(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')).toHaveLength(1)
  })
})

describe('report actions', () => {
  it('approves, says it cannot be undone, and moves focus to the result', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))

    expect(screen.getByText(ASK.reportApproved!.heading)).toBeInTheDocument()
    expect(document.querySelector('.morning .pill')).toHaveTextContent(ASK.reportApproved!.pill.text)
    expect(document.activeElement).toHaveTextContent(ASK.reportApproved!.resultMessage!)
    expect(screen.queryByRole('button', { name: ui.actionLabels.approve })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.actionLabels.undo })).not.toBeInTheDocument()
  })

  it('undoes the edit, keeps it paused, then redoes it, moving focus each time', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    await user.click(screen.getByRole('button', { name: ui.actionLabels.undo }))
    expect(document.activeElement).toHaveTextContent(ASK.reportUndone!.resultMessage!)
    expect(screen.getByText(ASK.reportUndone!.diff[1].value)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.actionLabels.approve })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: ui.actionLabels.redo }))
    expect(document.activeElement).toHaveTextContent(ui.redoneMessage)
    expect(screen.getByRole('button', { name: ui.actionLabels.approve })).toBeInTheDocument()
  })

  it('works from the keyboard alone', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    screen.getByRole('button', { name: ui.actionLabels.undo }).focus()
    await user.keyboard('{Enter}')
    expect(document.activeElement).toHaveTextContent(ASK.reportUndone!.resultMessage!)
  })

  it('Change this setting returns focus to the selected radio', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: ui.actionLabels.change }))
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Act alone' }))
    expect(document.querySelector('fieldset.settings')).toHaveClass('live')
  })

  it('resets approve and undo when the setting changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))
    expect(screen.getByText(ASK.reportApproved!.heading)).toBeInTheDocument()

    await selectSetting(user, 'Flag only')
    await selectSetting(user, 'Ask first')
    expect(screen.getByText(ASK.report.heading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ui.actionLabels.approve })).toBeInTheDocument()
    expect(screen.queryByText(ASK.reportApproved!.resultMessage!)).not.toBeInTheDocument()
  })
})

describe('the authority line', () => {
  it.each(settings.map((s) => [s.label, s] as const))(
    '%s: sits before the right step, with its own label, read in order',
    async (_label, setting) => {
      const user = userEvent.setup()
      render(<App />)
      await selectSetting(user, setting.label)

      const items = [...document.querySelectorAll('ol.steps > li')]
      const line = screen.getByTestId('authority-line')
      const at = items.indexOf(line)

      /* It is a real list item, between the last step within authority and the first after it. */
      expect(line.tagName).toBe('LI')
      expect(at).toBe(setting.limitIndex)
      expect(items[at - 1]).toHaveTextContent(setting.steps[setting.limitIndex - 1].title)
      expect(items[at + 1]).toHaveTextContent(setting.steps[setting.limitIndex].title)
      expect(line).toHaveTextContent(setting.limitLabel)
      expect(line).not.toHaveAttribute('aria-hidden')
    },
  )

  it('sits after step 4 for Act alone, after the draft for Ask first, after step 2 for Flag only', () => {
    expect(ACT.limitIndex).toBe(4)
    expect(ASK.limitIndex).toBe(3)
    expect(FLAG.limitIndex).toBe(2)
  })

  it('under Ask first, separates preparing the fix from sending it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    const items = [...document.querySelectorAll('ol.steps > li')]
    const line = screen.getByTestId('authority-line')
    const at = items.indexOf(line)

    expect(line).toHaveTextContent('Its authority ended here. It could prepare the fix. It could not send it.')
    /* Preparing the draft is above the line, inside its authority. Holding the send is below it. */
    expect(items[at - 1]).toHaveTextContent('Prepares the fix as a draft')
    expect(items[at + 1]).toHaveTextContent('Holds. Nothing sends.')
    expect(items[at - 1]).not.toHaveClass('after')
    expect(items[at + 1]).toHaveClass('after')
  })

  it('keeps Act alone and Flag only where they were, with the same labels', () => {
    expect(ACT.limitLabel).toBe("The agent's authority ended here. It finished the job.")
    expect(FLAG.limitLabel).toBe("The agent's authority ended here. It may only tell you.")
  })
})

describe('authority marks and their key', () => {
  it.each([
    ['Act alone', ['within', 'human']],
    ['Ask first', ['within', 'needs-approval', 'human']],
    ['Flag only', ['within', 'outside', 'schedule', 'human']],
  ] as const)('%s: the key lists only the marks in that night', async (label, expected) => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, label)

    const key = screen.getByTestId('mark-key')
    const listed = [...key.querySelectorAll('.key-items > span')].map((s) => s.getAttribute('data-kind'))
    expect(listed).toEqual(expected)

    const onScreen = [...new Set([...document.querySelectorAll('li.step')].map((li) => li.getAttribute('data-mark')))]
    expect([...listed].sort()).toEqual(onScreen.sort())
  })

  it('keeps every mark and the key out of the accessibility tree, since the text says it', () => {
    render(<App />)
    for (const mark of document.querySelectorAll('.mark')) {
      expect(mark).toHaveAttribute('aria-hidden', 'true')
    }
    expect(screen.getByTestId('mark-key')).toHaveAttribute('aria-hidden', 'true')
  })

  it('reads each step with its authority in words', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Flag only')
    for (const step of FLAG.steps) {
      expect(screen.getByText(`${ui.markPrefix[step.mark]}: ${step.authority}`)).toBeInTheDocument()
    }
  })

  it("marks Ask first's 6:00 AM hold as needing your approval", () => {
    const hold = ASK.steps.find((s) => s.time === '6:00 AM')!
    expect(hold.mark).toBe('needs-approval')
    expect(marksIn('ask-first')).toContain('needs-approval')
  })
})

describe('status pills', () => {
  it.each([
    ['Act alone', 'ok'],
    ['Ask first', 'wait'],
    ['Flag only', 'bad'],
  ] as const)('%s: carries a symbol and words, never colour alone', async (label, kind) => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, label)
    const setting = settings.find((s) => s.label === label)!

    const pill = document.querySelector('.morning .pill') as HTMLElement
    expect(pill).toHaveClass(kind)
    expect(pill).toHaveTextContent(setting.report.pill.text)
    expect(pill.querySelector('.pill-symbol')).toHaveAttribute('aria-hidden', 'true')
    /* The cost line stays under every pill, green included. */
    expect(screen.getByText(setting.report.cost)).toBeInTheDocument()
  })

  it('shows the pill on a Three mornings card once that setting is viewed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const card = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) })

    expect(card('Flag only')).not.toHaveTextContent(FLAG.report.pill.text)
    await selectSetting(user, 'Flag only')
    expect(card('Flag only')).toHaveTextContent(FLAG.report.pill.text)
    expect(card('Act alone')).toHaveTextContent(ACT.report.pill.text)
  })

  it('tells Ask first when the email was due, and to how many (simulated)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    expect(screen.getByText('Was due')).toBeInTheDocument()
    expect(screen.getByText('6:00 AM to 12,480 subscribers (simulated)')).toBeInTheDocument()
  })
})

describe('pass 4: Three mornings are the 8:40 comparison', () => {
  it('says so in its heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Three mornings, as of 8:40 AM' }),
    ).toBeInTheDocument()
  })

  it('keeps the Ask first card at its 8:40 outcome after Approve, Undo and Redo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    const card = () => screen.getByRole('button', { name: /^Ask first/ })

    await user.click(screen.getByRole('button', { name: ui.actionLabels.undo }))
    expect(card()).toHaveTextContent('Paused, waiting for you')
    expect(card()).toHaveTextContent(ASK.summary)

    await user.click(screen.getByRole('button', { name: ui.actionLabels.redo }))
    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))
    /* The report says it was sent. The card still shows the 8:40 morning. */
    expect(document.querySelector('.morning .pill')).toHaveTextContent(ASK.reportApproved!.pill.text)
    expect(card()).toHaveTextContent('Paused, waiting for you')
    expect(card()).not.toHaveTextContent(ASK.reportApproved!.pill.text)
  })
})

describe('pass 4: announcing a setting change', () => {
  it('says nothing on load, then one short line per change, in the one live region', async () => {
    const user = userEvent.setup()
    render(<App />)
    const live = screen.getByRole('status')
    expect(live).toHaveTextContent(/^$/)

    await selectSetting(user, 'Ask first')
    expect(live).toHaveTextContent(/^Ask first\. Paused, waiting for you\.$/)

    await selectSetting(user, 'Flag only')
    expect(live).toHaveTextContent(/^Flag only\. Sent with a dead code\.$/)

    await user.click(screen.getByRole('button', { name: /^Act alone/ }))
    expect(live).toHaveTextContent(/^Act alone\. Sent on time\.$/)

    expect(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')).toHaveLength(1)
  })

  it('does not leave a stale outcome in the live region after Approve', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))
    expect(screen.getByRole('status')).not.toHaveTextContent('Paused, waiting for you')
  })
})

describe('pass 4: Play the night controls', () => {
  const pauseBtn = () => screen.getByRole('button', { name: ui.pauseLabel })
  const nextBtn = () => screen.getByRole('button', { name: ui.nextLabel })

  it('shows Pause and Next only while a night is in progress', async () => {
    vi.useFakeTimers()
    render(<App />)
    expect(screen.queryByRole('button', { name: ui.pauseLabel })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.nextLabel })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: placard.playLabel }))
    expect(pauseBtn()).toBeInTheDocument()
    expect(nextBtn()).toBeInTheDocument()

    await tick(stepCount('act-alone'))
    expect(screen.queryByRole('button', { name: ui.pauseLabel })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.nextLabel })).not.toBeInTheDocument()
  })

  it('waits 2.5 seconds per step and announces the action, not a number', async () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: placard.playLabel }))
    const live = screen.getByRole('status')
    expect(live).toHaveTextContent('2:14 AM. Finds the expired code.')
    expect(live).not.toHaveTextContent(/step \d/i)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAY_INTERVAL_MS - 1)
    })
    expect(live).toHaveTextContent('2:14 AM. Finds the expired code.')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(live).toHaveTextContent('2:14 AM. Pauses the launch.')
    expect(PLAY_INTERVAL_MS).toBe(2500)
  })

  it('Pause holds the night where it is, and Resume carries on', async () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: placard.playLabel }))
    fireEvent.click(pauseBtn())

    expect(screen.getByRole('button', { name: ui.resumeLabel })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ui.playButtonProgress(1, 5) })).not.toHaveAttribute('aria-busy')
    await tick(3)
    expect(document.querySelectorAll('li.step.future')).toHaveLength(4)
    expect(screen.getByText(ui.waitingText)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: ui.resumeLabel }))
    await tick()
    expect(document.querySelectorAll('li.step.future')).toHaveLength(3)
  })

  it('Next steps by hand, paused or not, and past the last step ends the night', async () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: placard.playLabel }))
    fireEvent.click(pauseBtn())

    fireEvent.click(nextBtn())
    expect(screen.getByRole('status')).toHaveTextContent('2:14 AM. Pauses the launch.')
    fireEvent.click(nextBtn())
    fireEvent.click(nextBtn())
    fireEvent.click(nextBtn())
    expect(screen.getByRole('status')).toHaveTextContent('8:40 AM. You get back.')

    const next = nextBtn()
    next.focus()
    fireEvent.click(next)
    expect(screen.getByRole('status')).toHaveTextContent(ui.playFinishedMessage)
    /* Pause and Next are gone, so focus goes back to Play rather than being lost. */
    expect(document.activeElement).toBe(screen.getByRole('button', { name: placard.playAgainLabel }))
  })

  it('leaves the reduced motion path alone: no timed reveal, no Pause or Next', async () => {
    setReducedMotion(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: placard.playLabel }))
    expect(screen.queryByRole('button', { name: ui.pauseLabel })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.nextLabel })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(ui.playAtOnceMessage(ACT.label, 5))
  })
})

describe('pass 4: phone layout content', () => {
  it('has a one-sentence scenario and the bare task for phones, beside the full desktop copy', () => {
    render(<App />)
    const short = screen.getByText(placard.ledeShort)
    expect(short).toHaveClass('plac-short')
    expect(placard.ledeShort.match(/\.\s|\.$/g)).toHaveLength(1)
    expect(screen.getByText('Try all three.')).toHaveClass('plac-short')
    expect(screen.getByText(placard.lede)).toHaveClass('plac-long')
    expect(screen.getByText(placard.ask)).toHaveClass('plac-long')
  })

  it("shows the chosen setting's current pill under it, and under no other option", async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    const pills = document.querySelectorAll('.opt-pill')
    expect(pills).toHaveLength(1)
    expect(pills[0].closest('label')).toHaveAttribute('for', 'setting-ask-first')
    expect(pills[0]).toHaveTextContent('Paused, waiting for you')

    /* It follows the outcome, so after Approve it says what happened. */
    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))
    expect(document.querySelector('.opt-pill')).toHaveTextContent(ASK.reportApproved!.pill.text)
  })

  it('keeps the pill out of the radio name and description', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    const radio = screen.getByRole('radio', { name: 'Ask first' })
    expect(radio).toHaveAccessibleName('Ask first')
    expect(radio).toHaveAccessibleDescription(ASK.description)
  })
})

describe('pass 4: card focus', () => {
  it('moves focus to the morning report heading when a Three mornings card is used', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Flag only/ }))
    const heading = screen.getByRole('heading', { level: 3, name: 'Morning report, 8:40 AM' })
    expect(document.activeElement).toBe(heading)
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('radio', { name: 'Flag only' })).toBeChecked()
  })

  it('leaves focus on the radio when the setting is changed from the rail', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Flag only')
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Flag only' }))
  })
})

describe('pass 5: the draft step under Ask first', () => {
  it('is inside the agent\'s authority: solid square, "prepare a fix as a draft"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    const draft = ASK.steps.find((s) => s.id === 'draft')!
    expect(draft.mark).toBe('within')
    expect(screen.getByText('Within its authority: prepare a fix as a draft')).toBeInTheDocument()
    const row = screen.getByText('Prepares the fix as a draft').closest('li')!
    expect(row).toHaveAttribute('data-mark', 'within')
    expect(row).not.toHaveClass('after')
  })

  it('leaves the hold below the line as needing your approval, so the key still shows it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    const hold = screen.getByText('Holds. Nothing sends.').closest('li')!
    expect(hold).toHaveAttribute('data-mark', 'needs-approval')
    expect(hold).toHaveClass('after')
    expect(screen.getByText('Needs your approval: still waiting for you')).toBeInTheDocument()
    expect(marksIn('ask-first')).toEqual(['within', 'needs-approval', 'human'])
  })
})

describe('pass 5: the key', () => {
  it('carries a visible "Key" label inside its box', () => {
    render(<App />)
    const key = screen.getByTestId('mark-key')
    expect(key.querySelector('.key-label')).toHaveTextContent(/^Key$/)
    expect(key.querySelector('.key-items')).toBeInTheDocument()
  })
})

describe('pass 5: phone scroll to the night', () => {
  let scrolled: Element[] = []
  const nightScrolls = () => scrolled.filter((el) => el.id === 'log-heading')

  beforeEach(() => {
    scrolled = []
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this)
    }) as unknown as typeof Element.prototype.scrollIntoView
  })

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it('does not scroll on initial render', () => {
    setReducedMotion(false, true)
    render(<App />)
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls the Overnight heading into view, smoothly, when a phone visitor taps a setting', async () => {
    setReducedMotion(false, true)
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')

    expect(nightScrolls()).toHaveLength(1)
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })
    /* Focus stays on the choice. The announcement still fires. */
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Ask first' }))
    expect(screen.getByRole('status')).toHaveTextContent('Ask first. Paused, waiting for you.')
  })

  it('jumps instead of gliding under reduced motion', async () => {
    setReducedMotion(true, true)
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Flag only')
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('does not scroll when a Three mornings card changes the setting', async () => {
    setReducedMotion(false, true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Flag only/ }))
    expect(nightScrolls()).toHaveLength(0)
  })

  it('does not scroll on desktop', async () => {
    setReducedMotion(false, false)
    const user = userEvent.setup()
    render(<App />)
    await selectSetting(user, 'Ask first')
    expect(nightScrolls()).toHaveLength(0)
  })

  it('does not scroll when the setting is changed from the keyboard', async () => {
    setReducedMotion(false, true)
    const user = userEvent.setup()
    render(<App />)
    const radio = screen.getByRole('radio', { name: 'Flag only' })
    radio.focus()
    await user.keyboard(' ')
    expect(radio).toBeChecked()
    expect(nightScrolls()).toHaveLength(0)
  })
})

describe('pass 5: the question is back on phone', () => {
  it('sits between the one-sentence scenario and "Try all three."', () => {
    render(<App />)
    const scenario = screen.getByText(placard.ledeShort)
    const question = screen.getByText('What should the agent be allowed to do?', { selector: '.plac-short' })
    const task = screen.getByText('Try all three.')
    expect(question).toHaveClass('plac-question', 'plac-short')
    expect(scenario.nextElementSibling).toBe(question)
    expect(question.nextElementSibling?.nextElementSibling).toBe(task)
  })
})

describe('accessibility', () => {
  it('has no axe violations on load', async () => {
    const { container } = render(<App />)
    expect(await violationsIn(container)).toEqual([])
  })

  it('has no axe violations on any setting', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    for (const setting of settings) {
      await selectSetting(user, setting.label)
      expect(await violationsIn(container)).toEqual([])
    }
  })

  /* axe schedules its own work, so these run against the real clock. */
  it('has no axe violations while the night is playing', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: placard.playLabel }))
    expect(screen.getByText(ui.waitingText)).toBeInTheDocument()
    expect(await violationsIn(container)).toEqual([])
  })

  it('has no axe violations once the night is over', async () => {
    setReducedMotion(true)
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: placard.playLabel }))
    expect(screen.getByRole('button', { name: placard.playAgainLabel })).toBeInTheDocument()
    expect(await violationsIn(container)).toEqual([])
  })

  it('has no axe violations after approve, undo and redo', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await selectSetting(user, 'Ask first')
    await user.click(screen.getByRole('button', { name: ui.actionLabels.undo }))
    expect(await violationsIn(container)).toEqual([])

    await user.click(screen.getByRole('button', { name: ui.actionLabels.redo }))
    expect(await violationsIn(container)).toEqual([])

    await user.click(screen.getByRole('button', { name: ui.actionLabels.approve }))
    expect(await violationsIn(container)).toEqual([])
  })

  it('offers a skip link to main', () => {
    render(<App />)
    const skip = screen.getByRole('link', { name: ui.skipLinkLabel })
    expect(skip).toHaveAttribute('href', '#main')
    expect(document.querySelector('#main')).toBeInTheDocument()
  })
})

describe('the name', () => {
  it('is The Authority Line, on the page and on the main landmark', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'The Authority Line' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'The Authority Line' })).toBeInTheDocument()
  })

  it('never says "dial" anywhere in the rendered copy, under any setting', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    for (const setting of settings) {
      await selectSetting(user, setting.label)
      expect(container.textContent).not.toMatch(/dial/i)
    }
  })

  it('uses the new name in the browser tab title', () => {
    expect(indexHtml).toContain('<title>The Authority Line</title>')
    expect(indexHtml).not.toMatch(/dial/i)
  })
})

describe('house rules', () => {
  it('uses no em dashes in any rendered copy', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    for (const setting of settings) {
      await selectSetting(user, setting.label)
      expect(container.textContent).not.toContain('—')
    }
  })

  it('never shows an audience number without labelling it simulated', async () => {
    const user = userEvent.setup()
    render(<App />)
    let labelled = 0
    for (const setting of settings) {
      await selectSetting(user, setting.label)
      const report = document.querySelector('.morning') as HTMLElement
      const text = report.textContent ?? ''
      if (text.includes('12,480')) {
        expect(within(report).getAllByText(/simulated/i).length).toBeGreaterThan(0)
        labelled += 1
      }
    }
    /* Guard against the check passing because no report shows a number at all. */
    expect(labelled).toBeGreaterThan(0)
  })
})

/**
 * userEvent cannot run against a faked clock here, so the play tests drive the
 * button with fireEvent and step the clock one interval at a time. One advance
 * per interval is deliberate: each tick schedules the next only after React has
 * re-rendered, so a single large jump would run just one of them.
 */
async function tick(times = 1) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAY_INTERVAL_MS)
    })
  }
}

/**
 * axe cannot measure colour contrast in jsdom, because it needs a real canvas.
 * That rule is checked in the browser during the visual pass instead.
 */
async function violationsIn(container: HTMLElement) {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
