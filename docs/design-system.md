# MandiSaathi — Editorial AgriTech Design System

This design system defines the visual language, design tokens, component specifications, and accessibility standards for MandiSaathi.

---

## 1. Color System & Semantic Tokens

MandiSaathi uses a three-layer color architecture: **Primitive $\rightarrow$ Semantic $\rightarrow$ Component**.

### 1.1 Primitive Palette

| Token Name | Hex Code | Swatch & Context |
| :--- | :--- | :--- |
| `forest-900` | `#0D2B1E` | Deepest brand baseline, high-contrast dark text |
| `forest-800` | `#174B35` | **Primary Brand Forest Green**, active controls, key buttons |
| `forest-700` | `#1F5E43` | Hover states for primary buttons |
| `forest-100` | `#D9EBE1` | Subtle tint for active badges, selection fills |
| `forest-50` | `#F0F7F3` | Background tint for verified response cards |
| `harvest-600` | `#B59346` | Deep gold for high-contrast borders and icons |
| `harvest-500` | `#D7B66A` | **Harvest Gold Accent**, voice recording pulse, spread gain |
| `harvest-100` | `#F6EED8` | Soft gold background fill |
| `harvest-50` | `#FBF7EE` | Very soft highlight tint |
| `ivory-50` | `#FAF9F5` | Crisp card surface, white-point balance |
| `ivory-100` | `#F5F3EA` | **Warm Ivory Background Canvas** (organic paper tone) |
| `ivory-200` | `#E8E5DC` | Hairline divider border, clean table grid rules |
| `ivory-300` | `#DDD8CB` | Inactive control borders, outline states |
| `charcoal-900` | `#1B2620` | Primary headings, highest legibility body text |
| `charcoal-700` | `#2D3D34` | Standard body copy |
| `charcoal-500` | `#5A6B62` | Secondary metadata, timestamps, units |
| `charcoal-400` | `#829289` | Placeholder text, subtle icons |

### 1.2 Semantic Application Tokens

```css
:root {
  /* Surfaces */
  --surface-canvas: #F5F3EA;       /* Main application background */
  --surface-panel: #FAF9F5;        /* Card & container surfaces */
  --surface-elevated: #FFFFFF;     /* Modals, popovers, active inputs */
  --surface-subtle: rgba(23, 75, 53, 0.04); /* Hover row highlights */

  /* Hairlines & Borders */
  --border-hairline: rgba(37, 53, 44, 0.08); /* Minimal 1px separators */
  --border-focus: #174B35;         /* Active keyboard/touch focus */
  --border-accent: #D7B66A;        /* Verified badges & highlight borders */

  /* Text & Content */
  --text-primary: #1B2620;         /* Primary headings & values */
  --text-secondary: #5A6B62;       /* Descriptions & units */
  --text-muted: #829289;           /* Secondary metadata & timestamps */
  --text-brand: #174B35;           /* Semantic links & brand marks */
  --text-gold: #B59346;            /* High-value callouts */
}
```

---

## 2. Typography & Numerical Formatting

MandiSaathi pairs modern sans-serif typography with dedicated Indic typefaces and strict tabular numeral formatting.

### 2.1 Font Stack
- **English & Numerals**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Hindi (Devanagari)**: `'Noto Sans Devanagari'`, `sans-serif`
- **Punjabi (Gurmukhi)**: `'Noto Sans Gurmukhi'`, `sans-serif`
- **Tabular Numerals**: `font-feature-settings: "tnum" 1, "cv02" 1, "cv03" 1` or `font-mono`

### 2.2 Typographic Hierarchy Scale

| Role | Font Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `28px (1.75rem)` | `34px` | 700 (Bold) | `-0.02em` | Main dashboard title, key hero statement |
| **Page Title** | `22px (1.375rem)`| `28px` | 700 (Bold) | `-0.015em`| Screen headers |
| **Section Header**| `16px (1.00rem)` | `22px` | 600 (Semibold)| `-0.01em`| Sub-section titles |
| **Price Headline**| `24px – 32px`    | `32px` | 700 (Bold) | `-0.02em` (tnum)| Prominent modal prices (₹2320.00) |
| **Metric Label**  | `11px (0.6875rem)`| `14px` | 600 (Semibold)| `+0.05em` | Uppercase category & metric tags |
| **Body Primary**  | `14px (0.875rem)`| `20px` | 400 / 500  | `0em`     | Standard text, descriptions |
| **Body Secondary**| `12px (0.75rem)` | `16px` | 400 / 500  | `0em`     | Metadata, timestamps, arrival quantities |
| **Micro Caption** | `10px (0.625rem)`| `12px` | 500 (Medium)  | `+0.02em` | Status pills, badge text |

---

## 3. Spacing, Borders & Radius Scale

### 3.1 Spacing Scale
- `2xs`: `4px` (gap between badge icon and label)
- `xs`: `8px` (compact element spacing, input icon offsets)
- `sm`: `12px` (gap between related data elements)
- `md`: `16px` (standard container internal padding)
- `lg`: `24px` (section separation)
- `xl`: `32px` (major page block spacing)
- `2xl`: `48px` (hero and canvas padding)

### 3.2 Corner Radii
- Small tags / badges: `rounded (4px)`
- Interactive buttons / inputs: `rounded-lg (8px)`
- Cards & surface blocks: `rounded-xl (12px)`
- Voice action circle / floating mic: `rounded-full (9999px)`

### 3.3 Border & Shadow Rules
- **Rule 1**: Replace heavy `border-2` outlines with subtle 1px hairlines: `border border-charcoal/10` or `border-ivory-200`.
- **Rule 2**: Avoid thick drop shadows. Use precision ambient shadows:
  - `shadow-sm`: `0 1px 2px 0 rgba(23, 75, 53, 0.04)`
  - `shadow-md`: `0 4px 6px -1px rgba(23, 75, 53, 0.06), 0 2px 4px -2px rgba(23, 75, 53, 0.04)`
  - `shadow-voice`: `0 8px 24px -4px rgba(23, 75, 53, 0.25)` for active recording state.

---

## 4. Component Patterns (Adapted from Cult UI, Skiper UI & Linear)

### 4.1 Buttons
- **Primary CTA (`Button variant="forest"`)**: Deep forest green background, crisp white or harvest gold icon, subtle spring active state (`active:scale-[0.98] transition-transform duration-100`).
- **Secondary CTA (`Button variant="outline"`)**: Translucent ivory-surface background, 1px hairline border, charcoal text with subtle forest hover.
- **Micro-pill (`PromptChip`)**: Lightweight borderless pill with subtle 1px border, hover elevation, and regional language indicator tag.

### 4.2 Data Presentation Blocks (`MetricBlock`)
- Eliminates bulky multi-card grids.
- Formats metrics as an editorial data row: small uppercase tracking label on top, bold tabular numeric value in the center, and context badge/unit beneath.

### 4.3 Voice Assistant Interaction Surface
- **Idle State**: Calibrated 80px circular button with subtle ripple, clear mic glyph, and explicit prompt text.
- **Recording State**: Dynamic multi-frequency audio waveform reacting to live AudioContext volume level, pulsating amber/red recording indicator, explicit cancel/submit controls.
- **Processing State**: Clean indeterminate wave animation representing speech recognition and NLP entity extraction.
- **Response State**: High-contrast, clean result card displaying transcribed query, official APMC price record, and dedicated HTML5 audio player.

### 4.4 Responsive Mobile Data Rows
- On desktop ($>1024\text{px}$), renders full tabular data with sortable columns.
- On mobile ($<768\text{px}$), smoothly collapses into two-line compact rows:
  - Line 1: Commodity name + Modal Price (bold tabular).
  - Line 2: Mandi location + Auction reporting date + Arrival volume.
  - Zero awkward horizontal scrollbars.

---

## 5. Responsive Breakpoints & Thumb-Zone Guidelines

- **Mobile Narrow**: `360px – 389px` (Strict single-column, minimum 44px touch targets).
- **Mobile Standard**: `390px – 430px` (Optimized for modern Android devices: Pixel 7, Galaxy S23).
- **Tablet**: `768px – 1023px` (Collapsible sidebar, two-column metric grids).
- **Desktop**: `1024px – 1440px+` (Compact permanent sidebar, high-density editorial tables).

### Thumb-Zone Accessibility:
- On mobile, the primary voice action is anchored in the bottom navigation center (`MobileBottomNav.tsx`), elevated by 12px for effortless one-handed thumb reach during field use.
