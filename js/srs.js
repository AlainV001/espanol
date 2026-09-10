// Lightweight spaced-repetition (SM-2 style) state, persisted in localStorage.
const SRS_KEY = 'espanol_srs_v1';

function loadSrs() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSrs(state) {
  localStorage.setItem(SRS_KEY, JSON.stringify(state));
}

function itemId(subsectionId, index) {
  return `${subsectionId}::${index}`;
}

function getItemState(id) {
  const state = loadSrs();
  return state[id] || { reps: 0, interval: 0, due: 0, seen: 0, correct: 0 };
}

function isDue(id) {
  const s = getItemState(id);
  return s.due <= Date.now();
}

function recordResult(id, correct) {
  const state = loadSrs();
  const s = state[id] || { reps: 0, interval: 0, due: 0, seen: 0, correct: 0 };
  s.seen += 1;
  if (correct) {
    s.correct += 1;
    s.reps += 1;
    s.interval = s.reps === 1 ? 1 : s.reps === 2 ? 3 : Math.round(s.interval * 2.2) || 7;
  } else {
    s.reps = 0;
    s.interval = 0;
  }
  s.due = Date.now() + s.interval * 24 * 60 * 60 * 1000;
  state[id] = s;
  saveSrs(state);
  return s;
}

// mastered = at least 3 correct reps in a row
function isMastered(id) {
  return getItemState(id).reps >= 3;
}

function subsectionProgress(subsectionId, items) {
  let mastered = 0;
  let due = 0;
  items.forEach((_, i) => {
    const id = itemId(subsectionId, i);
    if (isMastered(id)) mastered += 1;
    if (isDue(id)) due += 1;
  });
  return { mastered, due, total: items.length };
}

window.SRS = { itemId, getItemState, isDue, recordResult, isMastered, subsectionProgress };
