# Frontend: Design System Showcase Page

## Routes added
- `/design-system` -> `DesignSystem` component (`src/routes/DesignSystem.tsx`)

## Components added
- `C:/Users/HSY/Desktop/capston/frontend/src/routes/DesignSystem.tsx` -- Single-page showcase of all design tokens and UI components. Self-contained, uses inline styles only (no external CSS file needed).

## Files modified
- `C:/Users/HSY/Desktop/capston/frontend/src/App.tsx` -- Added import for `DesignSystem` and registered route `/design-system` before the `*` catch-all.

## API hooks added
- None. This page is fully static/client-side.

## Page sections

| # | Section | What it shows | Edit file path shown |
|---|---------|---------------|---------------------|
| a | Colors | Swatch grid grouped by: Primary Surfaces, Neutrals (Gray Scale), Editorial Accents, Text & Rules, Semantic Accents, Status, Heatmap, Subway Lines. Token name + hex value under each swatch. | `tokens.css` |
| b | Typography | All 13 type tokens rendered at actual size. Shows name, size, line-height, weight, tracking. Includes Mono Label in mono font. | `tokens.css` |
| c | Spacing | `--space-1` through `--space-30` as horizontal bars with name + px value. | `tokens.css` |
| d | Radius | All 8 radius tokens (`xs` through `full`) as boxes with the radius applied. Includes description text. | `tokens.css` |
| e | Shadows | `--shadow-floating` applied to a card-radius box. | `tokens.css` |
| f | Component Heights | `--control-height-sm/md/cta/lg` and `--badge-height` as height bars with value labels. | `tokens.css` |
| g | Transitions | Token name + value list for `--transition-fast/base/slow`. | `tokens.css` |
| h | Z-Index | Token name + value list for `--z-modal-backdrop/modal/tooltip`. | `tokens.css` |
| i | Button | All 5 variants x 3 sizes + disabled state per variant. Loading states for primary/outline/filled. Full-width example. | `Button.tsx` |
| j | Card | Default (md padding), Inset (lg padding), and padding="none" with custom header/body zones. | `Card.tsx` |
| k | Badge | All 7 variants x 2 sizes with representative Korean/English labels. | `Badge.tsx` |
| l | Score | Values 20/55/85 demonstrating auto-tone (danger/warning/success). Size lg with delta arrows. Neutral tone override. | `Score.tsx` |
| m | MetricBar | Score tone with 5 quintile colors (values 15/35/55/75/92). Weight tone with % unit. | `MetricBar.tsx` |

## Design system gaps
- None identified. All tokens and components rendered correctly.

## Known issues
- The page is not in the spec section 6 screen list -- it is a developer tool only. It should not ship to production. If desired, it can be removed or gated behind an environment variable.
- The pre-existing Vite chunk size warning (891 kB) is unrelated to this page.

## Screenshot or test instructions
1. Run `npm run dev` in `frontend/`
2. Navigate to `http://localhost:5173/design-system`
3. Scroll through all sections to verify tokens and components render correctly
4. Each section heading shows the file path to edit for that section
