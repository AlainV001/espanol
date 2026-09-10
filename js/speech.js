// Text-to-speech helper using the Web Speech API.
function speak(text, lang = 'es-ES') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // stop any current utterance first
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

window.speak = speak;
