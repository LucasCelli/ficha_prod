# SaaS Design Token System

## Primitive Token Table

| Category | Tokens |
| --- | --- |
| Neutral | `--primitive-neutral-50..950` |
| Brand | `--primitive-brand-50..900` |
| Blue | `--primitive-blue-50..900` |
| Green | `--primitive-green-50..900` |
| Yellow | `--primitive-yellow-50..900` |
| Red | `--primitive-red-50..900` |
| Typography families | `--font-family-sans`, `--font-family-display`, `--font-family-mono`, `--font-family-base` |
| Typography weights | `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| Typography sizes | `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl` |
| Line heights | `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`, `--line-height-medium`, `--line-height-giant` |
| Spacing | `--space-0`, `--space-2`, `--space-4`, `--space-6`, `--space-8`, `--space-10`, `--space-12`, `--space-14`, `--space-16`, `--space-18`, `--space-20`, `--space-24`, `--space-28`, `--space-32`, `--space-40`, `--space-48`, `--space-64` |
| Radius | `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` (+ existing `2xl`, `3xl`, `pill`) |
| Shadows | `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Z-index | `--z-base`, `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`, `--z-tooltip` |
| Motion | `--duration-fast`, `--duration-normal`, `--duration-slow`, `--easing-emphasized`, `--easing-standard`, `--easing-decelerate`, `--easing-accelerate` |

## Semantic Token Table

| Group | Tokens |
| --- | --- |
| Foundation surfaces | `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-3` |
| Foundation text | `--color-text`, `--color-text-secondary`, `--color-text-muted` |
| Foundation borders | `--color-border`, `--color-border-soft` |
| Foundation intent | `--color-brand`, `--color-primary`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Legacy-compatible aliases | `--color-muted`, `--color-surface-soft`, `--color-primary-soft`, `--color-primary-strong`, `--color-primary-contrast`, `--color-text-inverse` |

## Component Token Table

| Component | Tokens |
| --- | --- |
| Button | `--button-bg`, `--button-text`, `--button-border`, `--button-hover`, `--button-active` |
| Input | `--input-bg`, `--input-border`, `--input-text`, `--input-placeholder`, `--input-focus` |
| Card | `--card-bg`, `--card-border`, `--card-shadow` |
| Modal | `--modal-bg`, `--modal-overlay` |
| Toast | `--toast-bg`, `--toast-text`, `--toast-border` |
| Table | `--table-bg`, `--table-border`, `--table-row-hover` |
| Chip | `--chip-bg`, `--chip-text` |
| Badge | `--badge-bg`, `--badge-text` |
| Alert | `--alert-success-bg`, `--alert-success-text`, `--alert-warning-bg`, `--alert-warning-text`, `--alert-danger-bg`, `--alert-danger-text`, `--alert-info-bg`, `--alert-info-text` |
| Sidebar | `--sidebar-bg`, `--sidebar-border`, `--sidebar-item-hover`, `--sidebar-item-active` |
| Navbar | `--navbar-bg`, `--navbar-border` |
| Metrics | `--metric-positive`, `--metric-negative`, `--metric-neutral` |
| KPI | `--kpi-bg`, `--kpi-border`, `--kpi-title`, `--kpi-value` |
| Charts | `--chart-1`, `--chart-2`, `--chart-3`, `--chart-4`, `--chart-5` |

## CSS Variable Definitions

Source of truth:
- `public/css/tokens/colors.css`
- `public/css/tokens/typography.css`
- `public/css/tokens/spacing.css`
- `public/css/tokens/radius.css`
- `public/css/tokens/shadows.css`
- `public/css/tokens/z-index.css`
- `public/css/tokens/motion.css`

Entrypoint:
- `public/css/design-tokens.css`

## Light Theme

```css
:root {
  --color-bg: var(--primitive-neutral-50);
  --color-surface: var(--primitive-neutral-0);
  --color-text: var(--primitive-neutral-900);
  --color-brand: var(--primitive-brand-600);
  --button-bg: var(--color-surface-2);
  --input-bg: var(--color-surface);
  --card-bg: var(--color-surface);
}
```

## Dark Theme

```css
html[data-theme="dark"] {
  --color-bg: var(--primitive-neutral-950);
  --color-surface: var(--primitive-neutral-900);
  --color-text: var(--primitive-neutral-100);
  --color-brand: var(--primitive-brand-400);
  --button-bg: color-mix(in srgb, var(--color-surface-3) 56%, var(--color-surface));
  --input-bg: var(--color-surface-2);
  --card-bg: var(--color-surface);
}
```

## Component CSS Using Tokens

- `public/css/components/button.css`
- `public/css/components/form-controls.css`
- `public/css/components/data-display.css`
- `public/css/components/feedback.css`
- `public/css/components/overlays.css`
- `public/css/components/navigation.css`
- `public/css/components/dashboard.css`
- `public/css/components/index.css`

## Example HTML Using Components

- Runtime demo: `public/design-system.html`

## Recommended Folder Structure

```text
design-system/
  README.md
tokens/
  colors
  spacing
  typography
  radius
  shadow
  motion
  z-index
themes/
  light
  dark
components/
  button
  input
  card
  modal
  toast
  table
  sidebar
  navbar
```
