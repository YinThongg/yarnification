// Progress persistence — saves where you are (section, active row, chart
// counters, later checkboxes/notes) to localStorage, per pattern. Everything
// is plain JSON so it works fully offline.

const KEY = 'yarnification:progress';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

// Load the saved progress blob for one pattern (or {} if none / unavailable).
export function loadProgress(patternId) {
  return readAll()[patternId] ?? {};
}

// Save the progress blob for one pattern, merged into the others.
export function saveProgress(patternId, data) {
  try {
    const all = readAll();
    all[patternId] = data;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable (private mode / quota) — progress just won't persist
  }
}

// --- Chosen size selection ---------------------------------------------------
// Which size(s) the user is knitting for a pattern, so the picker's choice
// survives reload. Separate from progress (which is scoped *per* size combo).

const CHOSEN_KEY = 'yarnification:chosen';

function readChosen() {
  try {
    return JSON.parse(localStorage.getItem(CHOSEN_KEY)) ?? {};
  } catch {
    return {};
  }
}

// Saved chosen labels for a pattern, or null to fall back to the pattern default.
export function loadChosen(patternId) {
  const value = readChosen()[patternId];
  return Array.isArray(value) && value.length ? value : null;
}

export function saveChosen(patternId, chosen) {
  try {
    const all = readChosen();
    all[patternId] = chosen;
    localStorage.setItem(CHOSEN_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — selection just won't persist
  }
}

// Remove one pattern/size progress blob without touching other patterns.
export function clearProgress(patternId) {
  try {
    const all = readAll();
    delete all[patternId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — in-memory UI state is still reset by the caller
  }
}

// Remove every progress entry and the chosen-size preference for one pattern.
// Progress keys include the size combination (for example `vest:1+2`), so
// deleting a library item must clear the whole prefix rather than one key.
export function clearPatternState(patternId) {
  try {
    const all = readAll();
    const prefix = `${patternId}:`;
    for (const key of Object.keys(all)) {
      if (key === patternId || key.startsWith(prefix)) delete all[key];
    }
    localStorage.setItem(KEY, JSON.stringify(all));

    const chosen = readChosen();
    delete chosen[patternId];
    localStorage.setItem(CHOSEN_KEY, JSON.stringify(chosen));
  } catch {
    // storage unavailable — there is no persistent state to clean up
  }
}
