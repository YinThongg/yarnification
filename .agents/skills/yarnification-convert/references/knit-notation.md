# Yarnification row notation

Use this notation only in a `grid` block's `knit` string. One grid block represents one row or round.

## Tokens

Separate tokens with commas. Compact consecutive knit and purl stitches as `K<n>` and `P<n>`.

| Token | Meaning | Net change |
| --- | --- | ---: |
| `K`, `K<n>` | knit | 0 |
| `P`, `P<n>` | purl | 0 |
| `K1TBL` | knit one through back loop | 0 |
| `YO` | yarn over | +1 |
| `K2TOG` | knit two together | -1 |
| `SSK` | slip-slip-knit | -1 |
| `P2TOG` | purl two together | -1 |
| `SSP` | slip-slip-purl | -1 |
| `SL`, `SLK`, `SLP` | slip; knitwise or purlwise when specified | 0 |
| `M1R`, `M1L` | make one | +1 |
| `M1RP`, `M1LP` | purlwise make one | +1 |
| `KFB` | knit front and back | +1 |
| `DS` | double stitch | 0 |

Write an unrecognized source abbreviation as `?<source-token>`, such as `?SKPO`. The app will display it as an unknown stitch instead of guessing.

## Structure

- Put `|` between stitch-marker segments: `K24,M1R | K1 | M1L,K25 [+2]`.
- Put `BOR` at the round boundary: `BOR,K48,BOR`.
- Put `TURN` at the exact short-row turn point: `TURN,DS,P22,TURN`.
- Set the block's `side` to `RS` or `WS`; do not reverse the token order for WS. The renderer handles visual reading direction.
- Append `[+N]` or `[-N]` whenever the row changes the total stitch count. The declared value must equal the arithmetic implied by the tokens.

Examples:

```text
K24
K2,P2,K2,P2
BOR,K24,M1R | K1 | M1L,K25,BOR [+2]
TURN,DS,P22,TURN
K4,?SKPO,K4 [-1]
```

For a repeated stitch pattern, expand enough repeats to represent the complete selected-size row. Use compact `K<n>`/`P<n>` runs; visual collapsing is handled by the app.
