// Exercise direction: which language is shown as the question vs. the answer.
// Persisted in localStorage so it survives reloads.
const DIRECTION_KEY = 'espanol_direction_v1';

function getDirection() {
  return localStorage.getItem(DIRECTION_KEY) === 'fr-es' ? 'fr-es' : 'es-fr';
}

function setDirection(dir) {
  localStorage.setItem(DIRECTION_KEY, dir === 'fr-es' ? 'fr-es' : 'es-fr');
}

function toggleDirection() {
  setDirection(getDirection() === 'es-fr' ? 'fr-es' : 'es-fr');
  return getDirection();
}

function directionToggleHtml() {
  const dir = getDirection();
  const label = dir === 'es-fr' ? 'ES → FR' : 'FR → ES';
  return `<button class="btn btn-direction" id="direction-toggle" aria-label="Changer le sens de l'exercice">${label}</button>`;
}

function bindDirectionToggle(container, onToggle) {
  const btn = container.querySelector('#direction-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    toggleDirection();
    onToggle();
  });
}

window.Direction = {
  get: getDirection,
  set: setDirection,
  toggle: toggleDirection,
  toggleHtml: directionToggleHtml,
  bindToggle: bindDirectionToggle
};
