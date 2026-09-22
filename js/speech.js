// Text-to-speech helper using the Web Speech API.
// Returns a promise that resolves once the utterance finishes (or after a
// safety timeout, in case the 'end' event never fires on some browsers).

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
    utter.rate = 0.95;
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
