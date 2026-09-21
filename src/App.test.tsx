import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import indexHtml from '../index.html?raw'
import { footer, getSetting, marksIn, mornings, placard, product, settings, ui } from './scenario'
import { stepCount } from './reducer'

const ACT = getSetting('act-alone')
const ASK = getSetting('ask-first')
const FLAG = getSetting('flag-only')

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
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
    expect(screen.getByText(ASK.reportApproved!.pill.text)).toBeInTheDocument()
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

  it('matches the approved render: after step 4 for Act alone, after step 2 otherwise', () => {
    expect(ACT.limitIndex).toBe(4)
    expect(ASK.limitIndex).toBe(2)
    expect(FLAG.limitIndex).toBe(2)
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
    const listed = [...key.querySelectorAll(':scope > span')].map((s) => s.getAttribute('data-kind'))
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
      await vi.advanceTimersByTimeAsync(1300)
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
