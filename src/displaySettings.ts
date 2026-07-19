export const UI_STYLE_VALUES = ['classic', 'modern'] as const;

export type UiStyle = (typeof UI_STYLE_VALUES)[number];

export function normalizeUiStyle(value: unknown): UiStyle {
  if (typeof value !== 'string') return 'classic';
  const normalized = value.trim().toLowerCase();
  return UI_STYLE_VALUES.includes(normalized as UiStyle)
    ? (normalized as UiStyle)
    : 'classic';
}
