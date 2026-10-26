// Text-to-speech helper using the Web Speech API.
// Returns a promise that resolves once the utterance finishes (or after a
// safety timeout, in case the 'end' event never fires on some browsers).

// The voice always speaks at this fixed, natural pace — it's no longer
// user-adjustable (see AnswerDelay below for what the speed control now does).
const FIXED_RATE = 0.8;

// In listening mode, the "speed" control doesn't change how fast the voice
// talks — it changes how long the silent pause is between the question and
// the spoken answer, i.e. how much thinking time the user gets to guess the
// translation before it's read out. Persisted in localStorage.
const DELAY_KEY = 'espanol_answer_delay_v1';
const MIN_DELAY = 1;
const MAX_DELAY = 8;
const DELAY_STEP = 1;
const DEFAULT_DELAY = 3;

function getAnswerDelay() {
  const stored = parseFloat(localStorage.getItem(DELAY_KEY));
  return Number.isFinite(stored) ? stored : DEFAULT_DELAY;
}

function setAnswerDelay(delay) {
  const clamped = Math.min(MAX_DELAY, Math.max(MIN_DELAY, delay));
  localStorage.setItem(DELAY_KEY, String(clamped));
  return clamped;
}

function adjustAnswerDelay(delta) {
  return setAnswerDelay(getAnswerDelay() + delta);
}

// Setting utter.lang alone isn't enough on some browsers/devices: if no voice
// is explicitly attached, they keep using whatever voice was last active
// (often the device's default language) regardless of the lang tag. So we look
// up a matching voice ourselves and attach it.
let voicesReadyPromise = null;
function ensureVoicesLoaded() {
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise(resolve => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) { resolve(existing); return; }
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
  return voicesReadyPromise;
}

function pickVoice(voices, lang) {
  if (!voices.length) return null;
  const exact = voices.find(v => v.lang === lang);
  if (exact) return exact;
  const prefix = lang.split('-')[0].toLowerCase();
  return voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix)) || null;
}

async function speak(text, lang = 'es-ES') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // stop any current utterance first
  const voices = await ensureVoicesLoaded();
  const voice = pickVoice(voices, lang);
  return new Promise(resolve => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (voice) utter.voice = voice;
    utter.rate = FIXED_RATE;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    utter.addEventListener('end', finish);
    utter.addEventListener('error', finish);
    window.speechSynthesis.speak(utter);
    setTimeout(finish, 4000);
  });
}

window.speak = speak;
window.AnswerDelay = { get: getAnswerDelay, set: setAnswerDelay, adjust: adjustAnswerDelay, MIN_DELAY, MAX_DELAY, DELAY_STEP };
