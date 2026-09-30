export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function isDarkHex(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 < 145;
}

export function textOn(hex: string): string {
  return isDarkHex(hex) ? '#ffffff' : '#1c1d24';
}

export const ACCENT_COLORS = [
  '#5873f8',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
  '#1c1d24',
];

export function categoryColor(categoryName: string, palette: string[]): string {
  let h = 0;
  for (let i = 0; i < categoryName.length; i++) h = (h * 31 + categoryName.charCodeAt(i)) % 9973;
  return palette[h % palette.length];
}