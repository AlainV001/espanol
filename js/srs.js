// Lightweight spaced-repetition (SM-2 style) state, persisted in localStorage.
const SRS_KEY = 'espanol_srs_v1';
const BADGE_KEY = 'espanol_mastery_badge_v1';
const STAR_KEY = 'espanol_perfect_star_v1';

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

// mistake = has been seen but the most recent answer was wrong (reps was reset to 0)
function isMistake(id) {
  const s = getItemState(id);
  return s.seen > 0 && s.reps === 0;
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

// Manual "mastered at least once" badge, dismissible to flag a subsection for re-study.
// Independent of live SRS progress so a deliberate dismissal isn't immediately undone.
function loadBadges() {
  try {
    return JSON.parse(localStorage.getItem(BADGE_KEY)) || {};
  } catch {
    return {};
  }
}

function isBadgeDismissed(subsectionId) {
  return !!loadBadges()[subsectionId];
}

function setBadgeDismissed(subsectionId, dismissed) {
  const badges = loadBadges();
  if (dismissed) {
    badges[subsectionId] = true;
  } else {
    delete badges[subsectionId];
  }
  localStorage.setItem(BADGE_KEY, JSON.stringify(badges));
}

// Perfect-round star: earned the first time a full pass through a subsection's
// items (any graded mode) is completed with zero mistakes. Sticks permanently
// once earned, as a separate achievement from the live-mastery trophy above.
function loadStars() {
  try {
    return JSON.parse(localStorage.getItem(STAR_KEY)) || {};
  } catch {
    return {};
  }
}

function isStarred(subsectionId) {
  return !!loadStars()[subsectionId];
}

function markStar(subsectionId) {
  const stars = loadStars();
  stars[subsectionId] = true;
  localStorage.setItem(STAR_KEY, JSON.stringify(stars));
}

window.SRS = {
  itemId, getItemState, isDue, recordResult, isMastered, isMistake, subsectionProgress,
  isBadgeDismissed, setBadgeDismissed, isStarred, markStar
};
