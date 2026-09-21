# The Authority Line

Build pass 3: the approved visual language, light and dark, on top of the pass 2 layout and behaviour.

Self-initiated concept by Arman Musaji. Fictional brand, simulated agent and data.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints, usually http://localhost:5173.

## Other commands

```bash
npm test          # Vitest: reducer unit tests plus render and axe-core tests
npm run build     # typecheck, then production build into dist/
npm run preview   # serve the production build
```

## The three layers

Layout comes from `../assets/layout-mockup-v4.html`. Look, marks and copy placement come from `../assets/visual-direction-v4.html`. Neither file's review notes ship.

1. **Placard.** Arman's voice, in serif on the page ground: title, byline, the situation, "Try all three", the numbered three-part reading guide, and the optional "Play the night" button.
2. **Product.** Halfmoon Tea's own tool, in sans on white under a tea-green bar. Agent settings on the tinted left column, as a three-stop rail. On the right in time order: the overnight log with its authority line and marks, then the morning report in its own cool-tinted section.
3. **Three mornings.** One card per setting. A card fills in with its status pill and one-line summary once that setting has been viewed, and clicking a card selects it.

### The visual language, in rules

- Warm means cost and nothing else. The cost stripe is the only warm accent.
- The authority line is a boundary, not a warning. It is neutral ink, the heaviest rule in the product.
- The morning report tint is cool daylight, so it never reads as caution.
- Squares mean the agent: solid acted within authority, empty needs your approval, struck is outside it. Pictograms mean not the agent: a clock for the schedule, a person for you.
- Status pills describe what happened to the email, with a symbol and words: green sent on time, amber paused, red sent with a dead code.
- `src/styles.test.ts` enforces the first three rules and the token discipline.

Selecting a setting shows its whole night and its morning at once. No stepping is required, so comparing all three takes three clicks.

## How it is put together

| File | What it holds |
|---|---|
| `src/scenario.ts` | Every word and number in the piece. Components hold no copy. |
| `src/reducer.ts` | All behaviour, as one pure reducer. No timers inside it. |
| `src/tokens.css` | The approved tokens, light and dark, plus the space, radius and size scales. |
| `src/styles.css` | Every rule. Colours, spaces and radii all come from tokens. |
| `src/Marks.tsx` | Authority marks, status pills, numbered section heads. |
| `src/App.tsx` | Shell, the play clock, focus management, and the wiring. |
| `src/Placard.tsx` | Title, situation and the Play control. |
| `src/SettingsPane.tsx` | Native radio group, then the off-limits rule that holds under every setting. |
| `src/ActivityLog.tsx` | Ordered list of the night, and the page's one live region. |
| `src/MorningReport.tsx` | Pill, headline, facts, before and after, cost, actions. |
| `src/ThreeMornings.tsx` | The comparison row. |

### The reducer

State is `{ permission, draftEdited, approved, undone, lastAction, viewed, playing, playStep, lastPlay }`.

Actions are `setPermission`, `startPlay`, `advancePlay`, `finishPlay`, `playAtOnce`, `approve`, `undoEdit`, `redoEdit`.

Rules worth knowing before changing it:

- `setPermission` resets everything except the list of viewed settings, which is what fills the Three mornings cards.
- Selecting the setting that is already selected is a no-op, so an approval is not silently thrown away.
- Invalid actions return the same state object, so an out of place Approve is a no-op rather than a lie.
- Undo and redo apply only to the draft edit under Ask first. Nothing else in the piece is reversible, and nothing else pretends to be.
- Play progress is held in state, but the clock that drives it lives in `App.tsx`, so the reducer stays pure.

### Accessibility

- The radio group is native. Each radio's accessible name is just the position name, with its explanation attached as the description.
- The activity log is an `<ol>`. During a play the current step carries `aria-current="step"`, and reached, current and not yet reached are each spoken, so state is never carried by opacity or colour alone.
- Exactly one polite live region on the page. It carries play progress and the message at the end.
- Play is optional and gives immediate feedback: the button reports its own progress and sets `aria-busy`, the log is outlined, and the report ghosts out behind "It is still night".
- Under `prefers-reduced-motion` there is no timed reveal. Every step appears at once and the status line says why.
- After Approve, Undo and Redo, focus moves to the result line, which has its own visible focus ring. "Change this setting" moves focus to the selected radio and outlines the settings group.
- Skip link to main. Footer in a contentinfo landmark. Visible focus everywhere. Interactive targets at least 44 by 44 CSS px.
- While the night plays, steps not yet reached show only their time, and the morning report shows only "It is still night". Both hold their space. Fading them instead would put their text below 4.5:1.
- Fonts are self-hosted with @fontsource, so nothing is fetched from a font service.

## Still to do

- axe cannot measure contrast or emulate colour schemes in jsdom, so those were checked in a real browser: zero violations in light and dark, at 1200 and 375 wide, in every state. Rerun that check after any token change.
- VoiceOver on Safari and a keyboard only walkthrough, before Gate B.
- Git is not initialised here. See the note in the handoff.
