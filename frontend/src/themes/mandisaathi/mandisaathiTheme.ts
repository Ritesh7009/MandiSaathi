import { defineTheme } from '@astryxdesign/core/theme';
import { mandisaathiIcons } from './icons';

const EDITORIAL_DISPLAY =
  "'Outfit', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Sans Kannada', 'Noto Sans Malayalam', system-ui, sans-serif";
const EDITORIAL_BODY =
  "'Plus Jakarta Sans', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Sans Kannada', 'Noto Sans Malayalam', system-ui, sans-serif";
const EDITORIAL_MONO = "'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * MandiSaathi editorial Astryx theme: Mineral Daylight & Obsidian Dark.
 * Enforces WCAG AA >= 4.5:1 foreground contrast across light and dark modes.
 */
export const mandisaathiTheme = defineTheme({
  name: 'mandisaathi',
  motion: {
    tempo: 0.95,
    character: 'crisp',
  },
  radius: {
    base: 4,
    multiplier: 1.25,
  },
  color: {
    accent: ['#0B4F37', '#057A55'],
    neutralStyle: 'neutral',
  },
  tokens: {
    '--color-accent': ['#0B4F37', '#057A55'],
    '--color-on-accent': ['#FFFFFF', '#FFFFFF'],
    '--color-accent-muted': ['rgba(11, 79, 55, 0.10)', 'rgba(52, 211, 153, 0.16)'],
    '--color-text-accent': ['#0B4F37', '#34D399'],
    '--color-icon-accent': ['#0B4F37', '#34D399'],

    '--color-background-body': ['#F4F7F5', '#06100B'],
    '--color-background-surface': ['#FFFFFF', '#0C1A13'],
    '--color-background-card': ['#FFFFFF', '#0C1A13'],
    '--color-background-popover': ['#FFFFFF', '#112219'],
    '--color-background-muted': ['rgba(13, 31, 23, 0.045)', 'rgba(240, 245, 242, 0.06)'],
    '--color-background-inverted': ['#0D1F17', '#F0F5F2'],
    '--color-background-error-inverted': ['#991B1B', '#DC2626'],

    '--color-text-primary': ['#0D1F17', '#F0F5F2'],
    '--color-text-secondary': ['#435A4E', '#A3B8AE'],
    '--color-text-disabled': ['#7A9084', '#587064'],
    '--color-icon-primary': ['#0D1F17', '#F0F5F2'],
    '--color-icon-secondary': ['#435A4E', '#A3B8AE'],

    '--color-border': ['rgba(13, 31, 23, 0.11)', 'rgba(240, 245, 242, 0.13)'],
    '--color-border-emphasized': ['rgba(13, 31, 23, 0.24)', 'rgba(240, 245, 242, 0.26)'],
    '--color-overlay': ['rgba(6, 16, 11, 0.48)', 'rgba(2, 8, 5, 0.72)'],
    '--color-overlay-hover': ['rgba(11, 79, 55, 0.06)', 'rgba(52, 211, 153, 0.09)'],
    '--color-overlay-pressed': ['rgba(11, 79, 55, 0.12)', 'rgba(52, 211, 153, 0.16)'],

    '--color-success': ['#0B4F37', '#057A55'],
    '--color-on-success': ['#FFFFFF', '#FFFFFF'],
    '--color-success-muted': ['rgba(11, 79, 55, 0.11)', 'rgba(16, 185, 129, 0.16)'],
    '--color-text-success': ['#0B4F37', '#34D399'],

    '--color-warning': ['#B45309', '#F59E0B'],
    '--color-on-warning': ['#FFFFFF', '#0D1F17'],
    '--color-warning-muted': ['rgba(180, 83, 9, 0.10)', 'rgba(245, 158, 11, 0.18)'],
    '--color-text-warning': ['#92400E', '#FCD34D'],

    '--color-error': ['#B91C1C', '#DC2626'],
    '--color-on-error': ['#FFFFFF', '#FFFFFF'],
    '--color-error-muted': ['rgba(185, 28, 28, 0.10)', 'rgba(239, 68, 68, 0.18)'],
    '--color-text-error': ['#B91C1C', '#FCA5A5'],

    '--color-info': ['#0369A1', '#0284C7'],
    '--color-on-info': ['#FFFFFF', '#FFFFFF'],
    '--color-info-muted': ['rgba(3, 105, 161, 0.10)', 'rgba(56, 189, 248, 0.16)'],
    '--color-text-info': ['#075985', '#7DD3FC'],

    '--radius-inner': '6px',
    '--radius-element': '10px',
    '--radius-container': '16px',
    '--radius-page': '24px',

    '--font-family-heading': EDITORIAL_DISPLAY,
    '--font-family-body': EDITORIAL_BODY,
    '--font-family-code': EDITORIAL_MONO,

    '--shadow-inset-selected': [
      'inset 0px 0px 0px 2px rgba(11, 79, 55, 0.55)',
      'inset 0px 0px 0px 2px rgba(52, 211, 153, 0.55)',
    ],
  },
  components: {
    button: {
      base: {
        fontWeight: '600',
        letterSpacing: '-0.01em',
      },
      'variant:primary': {
        boxShadow: '0 1px 2px rgba(11, 79, 55, 0.25)',
      },
    },
    card: {
      base: {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
      },
    },
    badge: {
      base: {
        fontWeight: '600',
        letterSpacing: '0.02em',
      },
    },
    banner: {
      base: {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
      },
    },
  },
  icons: mandisaathiIcons,
});

export default mandisaathiTheme;
