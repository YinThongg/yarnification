IMPORTANT: Before generating any knitting HTML file, strictly follow the rules below, and in TEMPLATE-GUIDE.md file. and do not restate them. After generating, self-check the output against every rule before finishing.

Knitting Pattern Tracker — Build Instructions

Build Process
When I provide a knitting pattern text file:
Step 1 — Parse to notation. Read the pattern text and convert it to .knit notation format as defined in KNIT-NOTATION.md. Output only the notation — not HTML, not JS arrays. Save it as knitting/[pattern-name].knit. Use compact stitch notation (K20 not twenty individual K entries). Include @source lines preserving the original language text. Include [+N] or [-N] stitch change markers on every row where the count changes.
Step 2 — Generate HTML. Copy the template HTML, embed the .knit notation content into the PATTERN_DATA variable, and save as knitting/[pattern-name].html.
That's it. Two steps. The runtime parser in the template handles all rendering, collapsing, repeats, markers, and validation.
Hard rules:

Always use smallest size numbers only for stitch counts in notation
Keep full sizing info in @source lines
Always include [+N]/[-N] on rows with increases/decreases
If a stitch abbreviation is unclear, write it as-is with a ? prefix (e.g. ?SKPO) and the parser will flag it
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
