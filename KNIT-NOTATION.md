# KNIT-NOTATION — Compact Knitting Pattern Text Format

This document defines the canonical text notation format used by this project. Both Claude Code (when generating patterns) and the HTML runtime parser must follow this spec exactly.

---

## File Structure

A pattern file is a plain `.knit` text file (or inline block). It consists of:

1. Header metadata lines
2. One or more sections, each containing a cast-on declaration and row definitions

---

## Header Lines

Header lines begin with `@` and appear before the first section:

```
@title: Pattern Name
@yarn: Description of yarn (weight, fiber, colorway)
@needle: 3.5mm circular, 40cm + 80cm
@gauge: 22 sts × 30 rows = 10cm in stockinette
@notes: Any general notes about the pattern
```

All header fields are optional but `@title` is strongly recommended.

---

## Section Headers

Sections divide the pattern into named pieces (yoke, body, sleeves, etc.). Each section header begins with `#`:

```
#YOKE
#BODY
#SLEEVE LEFT
#SLEEVE RIGHT
#NECKBAND
```

Section names are uppercase by convention. The parser treats everything between two `#` lines as belonging to the preceding section.

---

## Cast-On Declaration

Each section begins with a cast-on count:

```
@cast_on: 100
```

This sets the starting stitch count for that section. Required for the parser to initialize the stitch grid.

---

## Row Definitions

One row per line. Format:

```
R<n>: <stitch sequence> [<net change>]
```

### Stitch Tokens

| Token | Meaning |
|---|---|
| `K<n>` | Knit n stitches (e.g. `K24`) |
| `P<n>` | Purl n stitches (e.g. `P5`) |
| `YO` | Yarn over (+1 stitch) |
| `K2tog` | Knit 2 together (–1 stitch) |
| `SSK` | Slip, slip, knit (–1 stitch) |
| `SL` | Slip stitch (no stitch count change) |
| `M1R` | Make 1 right-leaning knit (+1 stitch) |
| `M1L` | Make 1 left-leaning knit (+1 stitch) |
| `M1Rp` | Make 1 right-leaning purl (+1 stitch) |
| `M1Lp` | Make 1 left-leaning purl (+1 stitch) |
| `KFB` | Knit front and back (+1 stitch) |
| `DS` | Double stitch (used in short rows, counts as 1) |
| `turn` | Short row turn point — row ends here on this pass |

Stitch tokens are separated by commas. Spaces are ignored by the parser.

### Stitch Markers

`|` between tokens indicates a stitch marker position. Rendered as a thick vertical line in the grid.

`BOR` at the start or end of a row marks the beginning-of-round. Rendered with a distinct visual indicator.

### Net Stitch Change (optional but recommended)

Append `[+n]` or `[-n]` at the end of the row to declare the expected net stitch count change. The parser uses this to validate the stitch arithmetic and flags a mismatch visually.

`[+0]` is valid (no change). Omitting the bracket skips validation for that row.

### Example Rows

```
R1: K24,M1R | K1 | M1L,K49,M1R | K1 | M1L,K25 [+4]
R2: K100
R3: K24 | K1 | K51 | K1 | K27
```

---

## WS (Wrong Side) Rows

Prefix the row label with `WS:` to indicate a wrong-side row. The parser renders these right-to-left with flip indicators at both edges.

```
R4(WS): turn,DS,P22,M1Lp | P1 | M1Rp,P2,turn [+2]
```

`turn` appearing mid-row marks a short row turn point. The grid for that row only extends to the turn stitch.

---

## Source Text

The line immediately following a row definition may begin with `@source:` to store the original instruction text (in any language). This is displayed in the sidebar when that row is selected. The full original text is preserved verbatim.

```
R1: K24,M1R | K1 | M1L,K49,M1R | K1 | M1L,K25 [+4]
@source: 右后片:24下, 放记号圈, 1下, 放记号圈, 前片:49下, 放记号圈, 1下, 放记号圈, 左后片:25下
```

`@source:` lines are not rendered in the grid; they are metadata only.

---

## Repeat Blocks

To indicate that a range of rows repeats:

```
REPEAT R3-R4: x5
```

This means rows R3–R4 are repeated 5 times total (not 5 additional times). The renderer shows:

- First repeat in full
- Vertical `...` (ellipsis rows)
- Final repeat with accumulated stitch counts

A repeat counter ("Repeat 1/5") is shown in the UI.

Rows within a repeat block still carry their own stitch definitions. The accumulated count must remain consistent; the parser verifies this if net-change brackets are present.

---

## Complete Example

```
@title: Simple Raglan Yoke
@yarn: DK weight, superwash merino
@needle: 3.5mm circular 80cm
@gauge: 22 sts × 30 rows = 10cm stockinette
@notes: Worked top-down in the round

#YOKE
@cast_on: 96

R1: BOR,K24,M1R | K1 | M1L,K44,M1R | K1 | M1L,K24,BOR [+4]
@source: Knit to marker, M1R, sm, K1, sm, M1L, repeat to end

R2: K100
@source: Knit all stitches

REPEAT R1-R2: x10

#BODY
@cast_on: 140

R1: BOR,K140,BOR
R2(WS): turn,DS,P70,turn
@source: Short row across front only
```

---

## Parser Rules Summary

1. Lines beginning with `@` outside a row definition are metadata.
2. Lines beginning with `#` open a new section.
3. Lines matching `R<n>:` or `R<n>(WS):` are row definitions.
4. The line immediately after a row definition, if it starts with `@source:`, is attached to that row.
5. Lines matching `REPEAT R<n>-R<m>: x<count>` define repeat blocks.
6. `|` within a row is a marker, not a separator between fields.
7. Stitch count is tracked cumulatively across rows within a section. A mismatch against a `[±n]` annotation is flagged visually.
8. Unrecognized stitch tokens are highlighted in the grid with a tooltip showing the raw token.
