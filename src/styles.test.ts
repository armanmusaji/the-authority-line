/**
 * Static checks on the stylesheets. They guard the colour rules Arman set and
 * the token discipline, which no render test can see.
 *
 * jsdom does not load CSS or emulate colour schemes, so contrast and axe in
 * both schemes are checked in a real browser. These checks make sure the dark
 * theme exists for every colour and that styles.css never bypasses the tokens.
 */
import { describe, expect, it } from 'vitest'
import styles from './styles.css?raw'
import tokens from './tokens.css?raw'

/** Strip comments, so rules described in prose are not counted as code. */
const code = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

function block(css: string, selector: string): string {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`Missing block: ${selector}`)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') depth -= 1
    if (depth === 0) return css.slice(open + 1, i)
  }
  throw new Error(`Unclosed block: ${selector}`)
}

const colourTokens = (css: string) =>
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{3,8}|rgb\([^)]*\))/g)].map((m) => m[1])

const tokenCss = code(tokens)
const styleCss = code(styles)

describe('tokens: light and dark', () => {
  const light = colourTokens(block(tokenCss, ':root {'))
  const darkMedia = colourTokens(block(block(tokenCss, '@media (prefers-color-scheme: dark)'), ':root:not([data-theme="light"])'))
  const darkForced = colourTokens(block(tokenCss, ':root[data-theme="dark"]'))

  it('defines a real palette', () => {
    expect(light.length).toBeGreaterThan(20)
  })

  it('gives every light colour a dark value, when the system asks for dark', () => {
    expect([...darkMedia].sort()).toEqual([...light].sort())
  })

  it('gives every light colour a dark value, when dark is forced by data-theme', () => {
    expect([...darkForced].sort()).toEqual([...light].sort())
  })
})

describe('styles: every colour comes from a token', () => {
  it('has no raw hex, rgb or hsl colours', () => {
    expect(styleCss).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
    expect(styleCss).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/)
  })

  it('uses only tokens that exist', () => {
    const defined = new Set([...tokenCss.matchAll(/(--[\w-]+):/g)].map((m) => m[1]))
    const used = new Set([...styleCss.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))
    const missing = [...used].filter((name) => !defined.has(name))
    expect(missing).toEqual([])
  })
})

describe("Arman's colour rules", () => {
  it('uses warm colour once, for the cost stripe, and nowhere else', () => {
    const uses = [...styleCss.matchAll(/var\(--sun\)/g)]
    expect(uses).toHaveLength(1)
    expect(block(styleCss, '.cost {')).toContain('var(--sun)')
  })

  it('draws the authority line in neutral ink, never in a warm or status colour', () => {
    const rule = block(styleCss, '.limit::before,')
    expect(rule).toContain('var(--limit)')
    expect(block(styleCss, '.limit {')).not.toMatch(/--sun|--bad|--wait/)
  })

  it('tints the morning report with the cool daylight tokens', () => {
    const morning = block(styleCss, '.morning {')
    expect(morning).toContain('var(--morning)')
    expect(morning).toContain('var(--morning-line)')
    expect(morning).not.toMatch(/--sun|--wait/)
  })
})

describe('the off-limits rule', () => {
  it('offers nothing to click: no pointer, no hover, no focus styling', () => {
    expect(block(styleCss, '.never {')).not.toMatch(/cursor/)
    expect(styleCss).not.toMatch(/\.never[^{]*:(hover|focus)/)
  })

  it('keeps the ink outline and the hatched texture', () => {
    const never = block(styleCss, '.never {')
    expect(never).toContain('solid var(--ink)')
    expect(never).toContain('repeating-linear-gradient')
  })

  it('has no SET marker or padlock styles left behind', () => {
    expect(styleCss).not.toMatch(/\.set\b/)
    expect(styleCss).not.toMatch(/\.lock\b/)
  })
})

describe('pass 4 layout rules', () => {
  const phone = block(styleCss, '@media (max-width: 760px)')

  it('on phone, hides the long placard copy and the reading guide, and shows the short copy', () => {
    expect(phone).toMatch(/\.plac-long,\s*\.guide\s*\{\s*display:\s*none/)
    expect(block(phone, '.plac-short {')).toContain('display: block')
  })

  it('on phone, shows the pill under the chosen option. On desktop it stays hidden', () => {
    expect(block(phone, '.opt-pill {')).toContain('display: flex')
    expect(block(styleCss, '.opt-pill {')).toContain('display: none')
    expect(block(styleCss, '.plac-short {')).toContain('display: none')
  })

  it('on desktop, keeps the settings column sticky, offset from the space scale', () => {
    const desktop = block(styleCss, '@media (min-width: 761px) and (min-height: 640px)')
    const inner = block(desktop, '.left-inner {')
    expect(inner).toContain('position: sticky')
    expect(inner).toMatch(/top: var\(--space-\d+\)/)
  })

  it('clips the product frame instead of hiding its overflow, so sticky can work', () => {
    const frame = block(styleCss, '.frame {')
    expect(frame).toContain('overflow: clip')
    expect(frame).not.toContain('overflow: hidden')
  })
})

describe('pass 5: the key box', () => {
  it('is outlined with the line token and a small radius from the scale', () => {
    const key = block(styleCss, '.key {')
    expect(key).toContain('solid var(--line)')
    expect(key).toMatch(/border-radius: var\(--radius-(xs|sm)\)/)
  })

  it('labels itself in the small capitals style, and keeps its distance from the report', () => {
    const label = block(styleCss, '.key-label {')
    expect(label).toContain('text-transform: uppercase')
    expect(block(styleCss, '.report-section {')).toMatch(/margin-top: var\(--space-\d+\)/)
  })
})

describe('Style Shop standards', () => {
  it.each(['.play {', '.play-step {', '.btn {', '.m {', '.skip-link {'])('%s is at least 44px tall', (selector) => {
    expect(block(styleCss, selector)).toContain('min-height: var(--target-min)')
  })

  it('sets the target minimum to 44px', () => {
    expect(tokenCss).toMatch(/--target-min:\s*44px/)
  })

  it('takes every gap, padding and margin from the space scale', () => {
    const declarations = [...styleCss.matchAll(/\b(gap|padding[\w-]*|margin[\w-]*):\s*([^;]+);/g)]
    const offenders = declarations
      .map((m) => `${m[1]}: ${m[2].trim()}`)
      .filter((d) => /\d+px/.test(d))
    expect(offenders).toEqual([])
  })

  it('takes every radius from the radius scale', () => {
    const radii = [...styleCss.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim())
    const offenders = radii.filter((r) => !/^(var\(--radius-[\w-]+\)|50%|0)$/.test(r))
    expect(offenders).toEqual([])
  })

  it('has no em dashes', () => {
    expect(styles + tokens).not.toContain('—')
  })
})
