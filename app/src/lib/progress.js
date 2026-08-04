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
