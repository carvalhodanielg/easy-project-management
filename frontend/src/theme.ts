export const T = {
  bgRail:    '#0D0E12',
  bgSidebar: '#111318',
  bgBase:    '#0D0E12',
  bgSurface: '#181920',
  bgHover:   '#1F2029',
  bgInput:   '#151620',
  bgModal:   '#111318',

  text1: '#DDE0F0',
  text2: '#6C6F87',
  text3: '#3E4058',

  border:  '#252632',
  border2: '#1C1D28',

  accent:  '#7C3AED',
  accentH: '#9461FB',

  status: {
    pendente:     '#6B7280',
    em_progresso: '#3B82F6',
    em_review:    '#F59E0B',
    feito:        '#22C55E',
    fechado:      '#4B5563',
  } as Record<string, string>,

  priority: {
    urgente: '#EF4444',
    alta:    '#F97316',
    normal:  '#3B82F6',
    baixa:   '#94A3B8',
  } as Record<string, string>,
} as const;
