# FlowLab Solutions Brand Guidelines

## FlowLab Design System

**Name:** FlowLab Design System
**Blurb:** The shared visual and interaction foundation for FlowLab Solutions.
**Package:** `@flowlab/ui` (components + tokens) · `@flowlab/branding` (theming + logo assets)
**Last set up:** 2026-05-18

## 1) Brand foundation

### Personality
- Precise
- Reliable
- Efficient
- Calm
- Technical

### Visual intent
- Dark-first SaaS UI.
- Automation-first tone: structured, operational, low-noise.
- Clarity over decoration: strong hierarchy, consistent emphasis.

## 2) Colour system

### Design tokens (source of truth)
- `--color-primary-dark`: `#1f2632`
- `--color-primary-teal`: `#00b4a1`
- `--color-secondary-teal`: `#04a9ba`
- `--color-neutral-light`: `#e1e1e1`
- `--color-neutral-mid`: `#676767`
- `--gradient-primary`: `linear-gradient(135deg, #00b4a1 0%, #04a9ba 100%)`

### Required semantic mapping
- `bg-app`: `--color-primary-dark`
- `bg-surface`: `--color-primary-dark`
- `text-primary`: `--color-neutral-light`
- `text-secondary`: `--color-neutral-mid`
- `accent-primary`: `--color-primary-teal`
- `accent-secondary`: `--color-secondary-teal`
- `accent-gradient`: `--gradient-primary`

### Usage rules
- Use tokens only. No raw hex values in components.
- Dark UI defaults: `bg-app` + `text-primary`.
- Teal tokens are for accents, active states, focus rings, and CTAs only.
- Gradient is CTA-only or key highlight-only.
- Do not use teal body text on dark surfaces.

## 3) Typography direction
- Use modern sans-serif typography.
- Headings are uppercase with letter spacing (`0.04em` to `0.08em`).
- Body text stays sentence case with high legibility.
- Do not define new font families unless already present in repo.

## 4) UI primitives

### Buttons
- Primary: `accent-gradient` background, dark text if contrast passes AA, otherwise `text-primary`.
- Secondary: dark fill + teal border (`accent-primary`).
- Ghost: transparent background + `text-primary`.
- Required states: default, hover, active, focus-visible, disabled.

### Inputs
- Default: dark surface with visible border using neutral token.
- Focus: 2px visible focus ring using `accent-primary` or `accent-secondary`.
- Error: dedicated error state with non-color cue (icon/text).
- Disabled: reduced emphasis without dropping below readable contrast.

### Cards and panels
- Dark surfaces on dark app shell with subtle border separation.
- Minimal elevation; avoid heavy blur stacks.

### Navigation
- Top nav: global app actions and workspace context.
- Sidebar: section navigation, persistent active state.
- Active item: teal accent + shape/weight change (not color only).

## 5) Style system

### Radius scale
- `--radius-sm`: `4px`
- `--radius-md`: `8px`
- `--radius-lg`: `12px`
- `--radius-xl`: `16px`

### Spacing scale (4/8 system)
- Base: `4px`
- Steps: `4, 8, 12, 16, 24, 32, 40, 48`
- Layout defaults to 8px rhythm.

### Shadows (dark UI)
- Use minimal shadows only for depth separation.
- Define 3 levels max: `sm`, `md`, `lg` with low opacity.

### Icon style
- Line-first icons, minimal fill.
- Consistent stroke weight.
- Filled icons reserved for critical status only.

## 6) Accessibility
- WCAG AA minimum for text and interactive controls.
- All interactive elements must expose visible `focus-visible` states.
- State changes must use color + another cue (shape, icon, text, weight).
- Avoid low-contrast teal-on-dark text combinations.

## 7) Logo assets and usage matrix

### Asset references (current + placeholders)
- Primary on Dark (PNG): `/apps/web/public/brand/logos/primary-on-dark.png`
- Primary on Dark (SVG placeholder): `/apps/web/public/brand/logos/primary-on-dark.svg`
- Primary on Light (PNG): `/apps/web/public/brand/logos/primary-on-light.png`
- Primary on Light (SVG placeholder): `/apps/web/public/brand/logos/primary-on-light.svg`
- Black (PNG): `/apps/web/public/brand/logos/black.png`
- Black (SVG placeholder): `/apps/web/public/brand/logos/black.svg`
- White (PNG): `/apps/web/public/brand/logos/white.png`
- White (SVG placeholder): `/apps/web/public/brand/logos/white.svg`
- Solutions Icon (PNG): `/apps/web/public/brand/logos/solutions-icon.png`
- Solutions Icon (SVG placeholder): `/apps/web/public/brand/logos/solutions-icon.svg`
- Favicon (PNG): `/apps/web/public/brand/logos/favicon.png`
- Favicon (SVG placeholder): `/apps/web/public/brand/logos/favicon.svg`

### Usage matrix
| Asset | Use on dark backgrounds | Use on light backgrounds | Typical placement |
|---|---|---|---|
| Primary on Dark | Yes | No | Header, login, dark hero |
| Primary on Light | No | Yes | Docs exports, light embeds |
| Black | No | Yes | Monochrome print/light-only contexts |
| White | Yes | No | Footer, overlays, dark media |
| Solutions Icon | Yes | Yes | App switcher, avatar mark, compact nav |
| Favicon | Yes | Yes | Browser tab/app icon |

## 8) App mapping
- `web`: marketing + auth shell; apply full token set and logo matrix.
- `portal`: tenant product UI; dark-first primitives and accessibility rules mandatory.
- `admin`: operational interface under web/admin routes; same token contract as portal.
- `packages/ui`: shared primitives are the enforcement layer for tokens, radius, spacing, shadow, and focus behavior.

## 9) Implementation checklist

- [x] Global CSS variables for all color, radius, spacing, shadow, and state tokens — set in both `apps/portal/app/globals.css` and `apps/web/app/globals.css`.
- [x] Tailwind `@theme inline` mapped to semantic tokens — `--color-surface-1/2`, `--color-accent-primary/secondary`, `--color-success/warning/danger` added to both apps.
- [x] Shared primitives in `packages/ui` token-driven — `Button`, `Input`, `Card`, `Badge`, `Stat`, `SectionTitle`, `Textarea`, `Select`, `Spinner`, `Alert` all use CSS custom properties only.
- [x] `Button` variants (primary / secondary / ghost) and sizes (sm / md / lg) standardised.
- [x] Focus-visible ring (2px, `accent-primary`/`accent-secondary`) on `Button`, `Input`, `Textarea`, `Select`.
- [x] Disabled states on all interactive primitives — reduced opacity + `cursor: not-allowed`.
- [x] `tokens.ts` export — type-safe CSS variable name constants from `@flowlab/ui`.
- [x] Logo usage by context (dark/light) wired via `getFlowLabLogoAsset()` in `@flowlab/branding`.
- [x] SVG logo files present in `apps/web/public/brand/logos/` (swap PNG for SVG when vector files are available).
- [x] State color tokens (`--state-success/warning/danger`) added to `buildSemanticTokens` in `@flowlab/branding` so tenant themes carry them.
