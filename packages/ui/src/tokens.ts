/**
 * FlowLab Design System — CSS custom property name constants.
 *
 * Use these instead of raw string literals when referencing design tokens
 * in inline styles or JS-driven style logic, so typos are caught at compile time.
 */

export const tokens = {
  // Surfaces
  appBg: "var(--app-bg)",
  surface1: "var(--surface-1)",
  surface2: "var(--surface-2)",

  // Text
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",

  // Accent
  accentPrimary: "var(--accent-primary)",
  accentSecondary: "var(--accent-secondary)",
  gradientPrimary: "var(--gradient-primary)",

  // Border
  borderSubtle: "var(--border-subtle)",

  // Radius
  radiusSm: "var(--radius-sm)",
  radiusMd: "var(--radius-md)",
  radiusLg: "var(--radius-lg)",
  radiusXl: "var(--radius-xl)",
  radiusXxl: "var(--radius-xxl)",

  // Spacing
  space1: "var(--space-1)",
  space2: "var(--space-2)",
  space3: "var(--space-3)",
  space4: "var(--space-4)",
  space5: "var(--space-5)",
  space6: "var(--space-6)",
  space7: "var(--space-7)",
  space8: "var(--space-8)",

  // Shadows
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",

  // State
  stateSuccess: "var(--state-success)",
  stateWarning: "var(--state-warning)",
  stateDanger: "var(--state-danger)"
} as const;

export type TokenKey = keyof typeof tokens;
