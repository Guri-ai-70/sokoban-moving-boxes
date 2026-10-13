# Design: Brass & Terrazzo

A 1950s office elevator. Walnut paneling, aged brass fittings, a cream
terrazzo floor, and an amber-lit floor indicator. Warm, solid, quiet.
Three alternative colour themes reuse the same structure with other
materials (see Themes).

## Rules
- **Static.** No animations, transitions or blinking. State changes
  (pressed, selected, solved) are instant colour/brightness changes.
- **System fonts only** (works offline via `file://`).
- Colours are defined once as CSS custom properties in `css/style.css`
  (`--bt-*`) and read by the canvas code through `getComputedStyle`
  (cached; re-read when the settings panel changes theme).
- Token names follow the default theme but are **roles**: walnut = deep /
  wall wood, brass = metal, amber = indicator glow, cream = floor and light
  text, oak = crate, lit = crate on its target.

## Palette (default: Brass & Terrazzo)
| Token | Value | Use |
|---|---|---|
| `--bt-walnut-900` | `#1c120b` | Page background, deepest wood |
| `--bt-walnut-700` | `#33210f` | Wall body, panels, top bar |
| `--bt-walnut-500` | `#5a3b20` | Wood grain / wall highlight |
| `--bt-brass-300` | `#ecd28f` | Brass highlight, lit text on wood |
| `--bt-brass-500` | `#c79b4b` | Brass body (buttons, trims, medallions) |
| `--bt-brass-700` | `#8a6427` | Brass shadow, engraved lines |
| `--bt-amber` | `#ffb53d` | Lit indicator: selected floor, floor number, focus |
| `--bt-cream` | `#ece3cf` | Terrazzo base, primary text on dark |
| `--bt-chip-1..3` | `#8a8174` `#b98f5d` `#4a4642` | Terrazzo chips |
| `--bt-charcoal` | `#26221f` | Lobby floor, HUD background |
| `--bt-oak` | `#a86f33` | Crate body |
| `--bt-oak-dark` | `#6f4519` | Crate slats / outline |
| `--bt-ink` | `#1a120b` | Text on brass |
| `--bt-lit` | `#ffa81f` | Crate on target: body |
| `--bt-lit-edge` | `#5a3806` | Crate on target: thick frame, outline |
| `--bt-lit-metal` | `#fff0c2` | Crate on target: corners, tape, rivets |

## Themes
Chosen in the settings panel (gear), saved as `sokoban:theme`; applied as
`data-theme` on `<html>`. A `data-theme` attribute on any element applies
that theme's tokens to it (used by the settings swatches).

| Theme | Walls | Floor | Metal | Glow | On-target crate |
|---|---|---|---|---|---|
| Brass & Terrazzo (`brass`) | walnut `#33210f` | cream terrazzo `#ece3cf` | brass `#c79b4b` | amber `#ffb53d` | `#ffa81f` |
| Chrome & Marble (`chrome`) | black lacquer `#1c1e22` | marble `#ecebe7` | chrome `#b9c0c7` | ice blue `#7fd6ff` | `#2fa8e0` |
| Copper & Slate (`copper`) | slate `#2b3136` | concrete `#d9d2c7` | copper `#c77a45` | orange `#ff8a3d` | `#ff7a24` |
| Jade & Ivory (`jade`) | jade `#123b33` | ivory `#f1ead9` | gold `#d4ad55` | warm gold `#ffd36b` | `#f0a514` |

## Crate styles
Saved as `sokoban:crate`; applied as `data-crate` on `<html>`.
- **Oak crate** (default): oak body, two slats, metal corner plates.
- **Parcel**: dark kraft box (`#85603a`) with a tape strip; on target the
  box lights up, the tape turns light and a round seal appears.
- **Steamer trunk**: dark leather (`#4a2c1e`), two metal bands, rivets, a
  lid seam; on target the whole trunk lights up and the bands go dark.

**Every crate on its target** also gets a thick dark frame (`--bt-lit-edge`,
about twice the normal outline) - a shape cue that does not depend on
telling colours apart.

### Crate contrast rules (checked for every theme x style)
- Lit body vs the same style's normal crate: at least 1.8:1.
- Thick frame vs the floor: at least 4.5:1.
- Lit body vs the floor: at least 1.5:1, with a clearly different hue.

## Type
- `--bt-font-ui`: Gill Sans / Century Gothic / Trebuchet MS - engraved-plate
  lettering for titles, labels and buttons. Uppercase with wide tracking for
  short labels.
- `--bt-font-num`: Bahnschrift / DIN / Futura with tabular numerals - the
  floor indicator, move / push / time counters.

## Board
- Floor: terrazzo with scattered chips and thin metal divider lines.
- Wall: dark wood block with a recessed panel and a metal cap where it faces
  open floor.
- Target: inlaid metal ring medallion.
- Player: bellhop figure (burgundy jacket, brass buttons, cap).

## Layout
- Top bar: brand, Settings (gear), Mute plate.
- The canvas fills the rest of the window and resizes with it (tiles up to
  96px on large screens). Floor panel: 5x2 landscape, 2x5 portrait.
- Touch controls while playing: under the board in portrait, a side column
  in landscape.

## Controls
- Buttons: metal plates, pressed = darker plate, instantly. Icons are drawn
  as SVG (no unicode glyphs). Minimum 64px for arrows, 48px for other
  buttons. Visible amber focus ring for keyboard users. Hover highlights
  only on devices with a fine pointer.
- Text contrast is at least 4.5:1 in every theme (disabled GO and the
  momentary pressed state excepted).
