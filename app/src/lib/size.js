// Size resolver — collapses a graded pattern value to the chosen size(s).
//
// Knitting patterns grade every number across sizes, written like:
//     "178, 194, 210 (226, 242, 258) [290, 322, 354]"
// The brackets are purely visual grouping; flattened it is just an ordered list
// of values, one per size. We store the whole string and resolve it at display
// time so no size information is ever lost.

// Split a graded string into { values, unit }.
//   "21, 21.5, 22 (22.5, 23, 24) [25, 26, 27] cm"
//     -> { values: ["21","21.5","22","22.5","23","24","25","26","27"], unit: "cm" }
// A string with a single value (e.g. "3.25mm") is treated as ungraded: one value.
export function parseGraded(str) {
  const raw = String(str).trim();

  // Peel a trailing unit (letters or common CJK unit chars) off the end.
  const unitMatch = raw.match(/[\s]*([A-Za-z%针次米厘公分]+)\s*$/);
  const unit = unitMatch ? unitMatch[1] : '';
  const body = unitMatch ? raw.slice(0, unitMatch.index) : raw;

  // Drop the grouping brackets, then split on commas OR whitespace. (Groups are
  // separated by a space, not a comma — "87 (94" — so comma alone isn't enough.)
  const values = body
    .replace(/[()\[\]]/g, ' ')
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  return { values, unit };
}

// Turn chosen size labels into 0-based indices, in the pattern's size order.
//   indicesFor(["1","2","3"], ["2"])       -> [1]
//   indicesFor(["1","2","3"], ["2","3"])   -> [1, 2]
export function indicesFor(sizeLabels, chosen) {
  return chosen
    .map((label) => sizeLabels.indexOf(label))
    .filter((i) => i >= 0);
}

// Resolve one graded string to the chosen size(s).
//   resolveGraded("178, 194, 210 (…)", [1])      -> "194"
//   resolveGraded("78, 82, 87 (…) cm", [1, 2])   -> "82(87) cm"
// Ungraded strings (one value) are returned as-is. Out-of-range or missing
// values fall back to the raw string so nothing silently vanishes.
export function resolveGraded(str, indices) {
  const { values, unit } = parseGraded(str);
  const suffix = unit ? ` ${unit}` : '';

  if (values.length <= 1) return String(str).trim(); // ungraded

  const picked = indices
    .map((i) => values[i])
    .filter((v) => v !== undefined);

  if (picked.length === 0) return String(str).trim(); // couldn't resolve — keep original

  if (picked.length === 1) return picked[0] + suffix;

  // Two+ sizes: primary(secondary…) e.g. "82(87)"
  return picked[0] + '(' + picked.slice(1).join(', ') + ')' + suffix;
}

// Fill a text template's {key} placeholders using a values map.
//   resolveText("K1, *(K4, yo, k2tog)* to last {edge} st, K1",
//               { edge: "1, 1, 0 (2, 1, 0) [1, 2, 0]" }, [1])
//     -> "K1, *(K4, yo, k2tog)* to last 1 st, K1"
export function resolveText(template, values = {}, indices = []) {
  return String(template).replace(/\{(\w+)\}/g, (whole, key) => {
    if (!(key in values)) return whole; // leave unknown placeholders visible
    return resolveGraded(values[key], indices);
  });
}
