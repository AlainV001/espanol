// Text-to-speech helper using the Web Speech API.
// Returns a promise that resolves once the utterance finishes (or after a
// safety timeout, in case the 'end' event never fires on some browsers).
function speak(text, lang = 'es-ES') {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  window.speechSynthesis.cancel(); // stop any current utterance first
  return new Promise(resolve => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
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
