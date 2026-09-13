// Loads and indexes data/content.json.
let CONTENT = null;

async function loadContent() {
  if (CONTENT) return CONTENT;
  const res = await fetch('data/content.json');
  CONTENT = await res.json();
  return CONTENT;
}

function findTheme(content, themeId) {
  return content.themes.find(t => t.id === themeId);
}

function findSubsection(content, subsectionId) {
  for (const theme of content.themes) {
    const sub = theme.subsections.find(s => s.id === subsectionId);
    if (sub) return { theme, subsection: sub };
  }
  return null;
}

// Every item across all themes/subsections whose most recent answer was wrong.
// Each item carries its original SRS id (_id) so answering it here updates the
// same underlying record — get it right and it drops out of this list.
function collectMistakeItems(content) {
  const out = [];
  content.themes.forEach(theme => {
    theme.subsections.forEach(sub => {
      sub.items.forEach((item, i) => {
        const id = itemId(sub.id, i);
        if (isMistake(id)) out.push({ ...item, _id: id });
      });
    });
  });
  return out;
}

// Pool of Spanish words (for multiple-choice distractors), stopwords excluded.
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'a',
  'al', 'que', 'tu', 'ta', 'ton', 'mi', 'y', 'o', 'es', 'está', 'estás', 'con',
  'sin', 'por', 'para', 'te', 'me', 'se', 'su', 'sus', 'no', 'hay', 'muy', 'tu/ta'
]);

function wordsFromItem(item) {
  return item.es
    .replace(/[¿?¡!.,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
}

// Picks a blank-worthy keyword from an item's Spanish sentence (longest content word).
function pickBlankWord(item) {
  const words = wordsFromItem(item);
  if (!words.length) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

function buildBlankSentence(item, word) {
  const idx = item.es.indexOf(word);
  if (idx === -1) return null;
  return item.es.slice(0, idx) + '____' + item.es.slice(idx + word.length);
}

// Gathers a pool of candidate keywords across a set of items, for distractors.
function keywordPool(items) {
  const set = new Set();
  items.forEach(item => wordsFromItem(item).forEach(w => set.add(w)));
  return Array.from(set);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

window.Data = {
  loadContent, findTheme, findSubsection, collectMistakeItems,
  pickBlankWord, buildBlankSentence, keywordPool, shuffle
};
