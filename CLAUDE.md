Knitting Pattern Tracker — Build Instructions
When I provide a knitting pattern (as a pre-converted text file), generate a new standalone HTML file based on the template guide in TEMPLATE-GUIDE.md. Always save output to the knitting/ folder, named after the pattern title slugified (e.g. knitting/raglan-blouse.html). If no title is found, ask me.
Sizing

Patterns include multiple sizes formatted like: 100 (102) 104 (106) 108 (110) 114 (116)
Always build the grid using the smallest size only (first number)
Keep the full sizing info in the source text display — don't strip it
Never create separate pages or tabs per size

Grid accuracy rules

Stitch count must be correct on every single row. After increases, the next row must have more boxes. After decreases, fewer boxes. No exceptions.
The grid is continuous — do not split into separate grids unless the instructions explicitly say so (e.g. "put sleeves on waste yarn" / 袖子放在费线上)
When the instructions say to separate pieces, create a new labeled grid on the canvas

Stitch markers / hook indicators

Where the pattern places markers (记号圈 / place marker), show a thick vertical line between the adjacent cells
BOR (beginning of round) gets a distinct visual indicator on the first/last stitch of the row

Collapse rules for long identical sections

If more than 10 identical stitches appear in sequence, collapse with ...
Show 2 stitches adjacent to any change point (marker, stitch type change, edge)
Example: boxes 1-2, ..., 23-24, thick line, 25, thick line, 26-27, ..., 74-75, thick line, 76, thick line, 77-78, ..., 99-100

Repeat sections

For "repeat rows X-Y N times": show the full rows for the first repeat, then vertical ... (three dots stacked), then show the final repeat with the correct accumulated stitch counts
For "repeat stitch pattern to end": expand to fill the row based on the total stitch count, using collapse ... if over 10 identical
Include a repeat counter in the UI showing "Repeat 1/N"

Flipped / wrong side rows

WS (反面) rows read right to left. Show a flip indicator at both edges of the row
Short rows that say 翻面 (turn/flip) show the turn point and the row only extends partway across the grid

Increase/decrease symbols

Use a + symbol for increases but label the specific type on the symbol: M1L, M1R, M1L-p, M1R-p, KFB, etc.
DS (double stitch) uses its own symbol
Standard decreases: K2tog, SSK, etc. use their own symbols

Source text

Store the original instruction text per row in whatever language it was written
Display it in the sidebar when that row is selected
Preserve the full sizing information in the source text even though the grid only shows smallest size

Metadata

Extract pattern metadata (gauge, yarn weight, needle size, finished measurements) and display in a small info panel in the sidebar

Ambiguity handling

If a stitch abbreviation is unrecognized, flag it visually on the cell (highlight + tooltip) rather than guessing
If piece separation is unclear, ask me before splitting into separate grids
