# Design: Brass & Terrazzo

A 1950s office elevator. Walnut paneling, aged brass fittings, a cream
terrazzo floor, and an amber-lit floor indicator. Warm, solid, quiet.

## Rules
- **Static.** No animations, transitions or blinking. State changes
  (pressed, selected, solved) are instant colour/brightness changes.
- **System fonts only** (works offline via `file://`).
- Colours are defined once as CSS custom properties in `css/style.css`
  (`--bt-*`) and read by the canvas code through `getComputedStyle`.

## Palette
| Token | Value | Use |
|---|---|---|
| `--bt-walnut-900` | `#1c120b` | Page background, deepest wood |
| `--bt-walnut-700` | `#33210f` | Wall body, panels |
| `--bt-walnut-500` | `#5a3b20` | Wood grain / wall highlight |
| `--bt-brass-300` | `#ecd28f` | Brass highlight, lit text on wood |
| `--bt-brass-500` | `#c79b4b` | Brass body (buttons, trims, medallions) |
| `--bt-brass-700` | `#8a6427` | Brass shadow, engraved lines |
| `--bt-amber` | `#ffb53d` | Lit indicator: selected floor, floor number, focus |
| `--bt-cream` | `#ece3cf` | Terrazzo base, primary text on dark |
| `--bt-chip-1` | `#8a8174` | Terrazzo chip (grey) |
| `--bt-chip-2` | `#b98f5d` | Terrazzo chip (ochre) |
| `--bt-chip-3` | `#4a4642` | Terrazzo chip (charcoal) |
| `--bt-charcoal` | `#26221f` | Terrazzo border strip, HUD background |
| `--bt-oak` | `#b57b3c` | Crate body |
| `--bt-oak-dark` | `#6f4519` | Crate slats / outline |
| `--bt-ink` | `#1a120b` | Text on brass |

## Type
- `--bt-font-ui`: Gill Sans / Century Gothic / Trebuchet MS - engraved-plate
  lettering for titles, labels and buttons. Uppercase with wide tracking for
  short labels.
- `--bt-font-num`: Bahnschrift / DIN / Futura with tabular numerals - the
  floor indicator, move / push / time counters.

## Board
- Floor: cream terrazzo with scattered chips.
- Wall: walnut block with a thin brass top edge.
- Target: inlaid brass ring medallion.
- Box: oak crate with brass corner plates. On target: lit brass crate
  (brighter, not just a different hue).
- Player: bellhop figure (burgundy jacket, brass buttons, cap).

## Controls
- Touch buttons: brass plates on walnut, pressed = darker brass, instantly.
  Arrows are drawn as SVG (no unicode glyphs). Minimum 64px for arrows,
  48px for other buttons. Visible amber focus ring for keyboard users.
