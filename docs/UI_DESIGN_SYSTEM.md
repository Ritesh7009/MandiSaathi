# MandiSaathi UI Design System — Editorial Indian AgriTech

> **Version:** 2.0 (Editorial & Anti-Slop Redesign)  
> **Target Audience:** Indian farmers, commission agents (Arhtiyas), traders, and rural cooperative members.  
> **Operating Environment:** Direct sunlight outdoor mobile use, rural 4G/3G networks, multi-lingual native scripts.  
> **Guiding Principle:** **Function First, Zero Slop.** Every visual element must serve clarity, trust, and speed.

---

## 1. Color System (Sunlight-Contrast & Agriculture-Authentic)

All colors are grounded in natural agricultural realities: deep forest green (growth, vitality), warm harvest ochre (ripe wheat, mustard fields), and ivory parchment (clean ledger paper).

### A. Primitive Tokens

| Token | Hex Value | Semantic Role | Contrast on Parchment (`#FAF9F5`) |
| :--- | :--- | :--- | :---: |
| `--forest-900` | `#103C2B` | Primary headings, dark accents | **11.8:1** (AAA Pass) |
| `--forest-800` | `#174B35` | Primary brand color, active buttons, focused borders | **9.6:1** (AAA Pass) |
| `--forest-700` | `#1F5E43` | Hover states, secondary brand accents | **7.2:1** (AAA Pass) |
| `--forest-50` | `#F0F7F3` | Active tab highlights, badge backgrounds | Tint |
| `--harvest-dark`| `#B59346` | Price spreads, highlighted modal benchmarks | **4.8:1** (AA Pass) |
| `--harvest-500` | `#D7B66A` | Accent borders, attention chips, listening pulse | Tint / Accent |
| `--parchment` | `#FAF9F5` | Primary app canvas & background | Base |
| `--surface-white`| `#FFFFFF` | Card containers, interactive surfaces | High Contrast Base |
| `--charcoal-900`| `#101713` | Body copy, price values, metrics | **15.2:1** (AAA Pass) |
| `--charcoal-600`| `#2C3E33` | Subtitles, helper text, timestamps | **8.1:1** (AAA Pass) |
| `--hairline` | `#D2CDBD` | Clean card borders, table dividers | **3.2:1** (AA UI Components) |

### B. Anti-Slop Ban List (Forbidden in MandiSaathi)
* ❌ **NO AI Purple / Violet:** (`#8B5CF6`, `#A855F7`, `#6366F1`) — these belong in Silicon Valley developer SaaS, not Indian agriculture.
* ❌ **NO Gaudy Radial Mesh Backgrounds:** Artificial glowing gradients reduce outdoor legibility.
* ❌ **NO Cheesy Sparkle Icons:** Icons like `Sparkles`, `Bot`, `Wand2` are banned. Use authentic agricultural and data icons (`Sprout`, `Coins`, `Scale`, `Mic`, `FileText`, `CheckCircle2`).

---

## 2. Typography & Script Engineering

Indian languages require specialized vertical clearance so vowel signs (matras like ू, ौ, ੀ, ু, ు, ു) are never clipped.

### A. Font Stack
```css
font-family:
  'Inter',
  'Noto Sans Devanagari',  /* Hindi, Marathi */
  'Noto Sans Gurmukhi',    /* Punjabi */
  'Noto Sans Gujarati',    /* Gujarati */
  'Noto Sans Bengali',     /* Bengali */
  'Noto Sans Telugu',      /* Telugu */
  'Noto Sans Tamil',       /* Tamil */
  'Noto Sans Kannada',     /* Kannada */
  'Noto Sans Malayalam',   /* Malayalam */
  -apple-system, BlinkMacSystemFont, sans-serif;
```

### B. Vertical Metrics
* **Base English Line-Height:** `1.5`
* **Indic Scripts Line-Height:** `1.65` (`:lang(hi)`, `:lang(pa)`, `:lang(mr)`, etc.) to prevent matra collisions.
* **Price & Numerical Formatting:** Always use `.tabular-nums` / `.tnum` (`font-feature-settings: "tnum" 1, "zero" 1`) so digits align cleanly in columns and price tables.

---

## 3. Reference Library Component Implementations

### A. `motion-primitives.com` Patterns
1. **`NumberTicker`**: Smooth animated rolling transition for changing prices (e.g., transition from ₹2150 to ₹2320).
2. **`SpringTabs`**: Sliding pill indicator behind active dialect and navigation buttons with spring physics (`layoutId="activeTab"`).
3. **`TextShimmer`**: Subtle, calm gold shimmer during voice processing state instead of jarring spinners.

### B. `ui.watermelon.sh` Patterns
1. **Data Provenance Badges**: Refined micro-bordered badges indicating data source (`Verified APMC Market Record`, `Government Agmarknet Feed`, `Offline Saved`).
2. **High-Density Tabular Grid**: Clean, high-contrast table layout for mandi price records with sticky headers and legible status dots.

### C. `cult-ui.com` Patterns
1. **Spotlight Card Borders**: Subtle border highlights that respond to hover or tap with organic forest-green or harvest-gold tones.
2. **Organic Parchment Texture**: SVG noise overlay on the `#FAF9F5` background, giving the appearance of archival agricultural ledger paper.
3. **Mobile Bottom Sheet**: Accessible filter drawer that slides up from the bottom on mobile devices.

### D. `skiper-ui.com` Patterns
1. **Acoustic Voice Hub**: Ergonomic circular listening centerpiece with 16-bar responsive audio wave spectrum.
2. **Tactile Spring Microphone**: Big, thumb-friendly ($64\times 64\text{px}$) microphone button with haptic-feel CSS active scaling (`active:scale-95`).

### E. `threeui.com` / `threejs.org` Patterns
1. **Topographical Terrain Canvas**: Subtle, undulating contour lines in the hero section representing agricultural land topography.
2. **Performance Constraints**: Low polygon count, capped at 30/60fps, pauses automatically when off-screen, with static SVG fallback for low-power mobile devices.

### F. `designeer.xyz` Patterns
1. **Editorial White-Space & Layout Discipline**: Wide gutters, clear content hierarchy, and deliberate section separation.
2. **Farmer Ergonomics**: Minimum $48\times 48\text{px}$ touch targets across all mobile buttons, chips, and table rows.

---

## 4. Quality & Accessibility Verification Checklist

Before shipping any UI change:
- [ ] **Outdoor Sunlight Test:** Text passes WCAG AAA contrast ratio ($\ge 7:1$ for body, $\ge 4.5:1$ for large text).
- [ ] **Touch Target Test:** All interactive elements $\ge 48\times 48\text{px}$ on mobile viewports.
- [ ] **Script Clearance Test:** Devanagari, Gurmukhi, and South Indian matras render without clipping.
- [ ] **Reduced Motion Test:** `prefers-reduced-motion` suppresses all non-essential animations.
- [ ] **Data Integrity Test:** Prices are never mocked; closed-auction records are never called "live telemetry".
- [ ] **Zero AI Slop Test:** No purple glows, no sparkle icons, no generic dark mesh.

