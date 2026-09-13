const app = document.getElementById('app');

async function router() {
  const content = await window.Data.loadContent();
  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) {
    renderHome(content);
  } else if (parts[0] === 'theme' && parts[1]) {
    renderTheme(content, parts[1]);
  } else if (parts[0] === 'session' && parts[1] && parts[2]) {
    renderSession(content, parts[1], parts[2]);
  } else if (parts[0] === 'mistakes' && parts[1]) {
    renderMistakesSession(content, parts[1]);
  } else if (parts[0] === 'mistakes') {
    renderMistakesHub(content);
  } else {
    renderHome(content);
  }
}

const EXERCISE_MODES = [
  ['flashcards', '🗂️', 'Tarjetas'],
  ['listen', '🎧', 'Escuchar'],
  ['quiz', '✅', 'Opción múltiple'],
  ['fillblank', '✏️', 'Completar']
];

function modeButtonsHtml(baseHref, modeKeys) {
  return EXERCISE_MODES
    .filter(([key]) => modeKeys.includes(key))
    .map(([key, icon, label]) => `<a class="btn btn-mode btn-mode-icon" href="${baseHref}/${key}" title="${label}" aria-label="${label}">${icon}</a>`)
    .join('');
}

function themeProgress(theme) {
  let mastered = 0;
  let total = 0;
  theme.subsections.forEach(sub => {
    const p = window.SRS.subsectionProgress(sub.id, sub.items);
    mastered += p.mastered;
    total += p.total;
  });
  return { mastered, total };
}

function renderHome(content) {
  const mistakeCount = window.Data.collectMistakeItems(content).length;
  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <h1>Español con Astrid</h1>
        ${window.Direction.toggleHtml()}
      </div>
      <p class="subtitle">Elige un tema para practicar</p>
    </header>
    ${mistakeCount ? `
      <a class="theme-card mistakes-card" href="#/mistakes">
        <div class="theme-card-title">⚠️ Errores para repasar</div>
        <div class="theme-card-meta">${mistakeCount} elemento${mistakeCount > 1 ? 's' : ''} para corregir</div>
      </a>` : ''}
    <div class="theme-list">
      ${content.themes.map(theme => {
        const p = themeProgress(theme);
        const pct = p.total ? Math.round((p.mastered / p.total) * 100) : 0;
        return `
          <a class="theme-card" href="#/theme/${theme.id}">
            <div class="theme-card-title">${theme.title}</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="theme-card-meta">${p.mastered} / ${p.total} dominadas</div>
          </a>
        `;
      }).join('')}
    </div>
  `;
  window.Direction.bindToggle(app, router);
}

function renderTheme(content, themeId) {
  const theme = window.Data.findTheme(content, themeId);
  if (!theme) { location.hash = '#/'; return; }

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <a class="back-link" href="#/">&larr; Temas</a>
        ${window.Direction.toggleHtml()}
      </div>
      <h1>${theme.title}</h1>
    </header>
    ${theme.notes && theme.notes.length ? `
      <details class="notes-box">
        <summary>À retenir</summary>
        <ul>${theme.notes.map(n => `<li>${n}</li>`).join('')}</ul>
      </details>` : ''}
    <div class="subsection-list">
      ${theme.subsections.map(sub => {
        const p = window.SRS.subsectionProgress(sub.id, sub.items);
        const modeKeys = sub.kind === 'vocab'
          ? ['flashcards', 'listen', 'quiz']
          : ['flashcards', 'listen', 'quiz', 'fillblank'];
        return `
          <div class="subsection-card">
            <div class="subsection-title">${sub.title}</div>
            <div class="subsection-meta">${p.mastered} / ${p.total} dominadas ${p.due ? `· ${p.due} para repasar` : ''}</div>
            <div class="mode-buttons">
              ${modeButtonsHtml(`#/session/${sub.id}`, modeKeys)}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  window.Direction.bindToggle(app, () => renderTheme(content, themeId));
}

function renderMistakesHub(content) {
  const mistakes = window.Data.collectMistakeItems(content);
  const hasBlankable = mistakes.some(it => window.Data.pickBlankWord(it));
  const modeKeys = ['flashcards', 'listen', 'quiz', ...(hasBlankable ? ['fillblank'] : [])];

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <a class="back-link" href="#/">&larr; Inicio</a>
        ${window.Direction.toggleHtml()}
      </div>
      <h1>⚠️ Errores para repasar</h1>
    </header>
    ${mistakes.length === 0 ? `
      <div class="notes-box">¡Genial! No tienes errores pendientes.</div>
    ` : `
      <div class="subsection-list">
        <div class="subsection-card">
          <div class="subsection-title">${mistakes.length} elemento${mistakes.length > 1 ? 's' : ''} para corregir</div>
          <div class="mode-buttons">
            ${modeButtonsHtml('#/mistakes', modeKeys)}
          </div>
        </div>
      </div>
    `}
  `;
  window.Direction.bindToggle(app, () => renderMistakesHub(content));
}

function renderMistakesSession(content, mode) {
  const items = window.Data.collectMistakeItems(content);
  if (!items.length) { location.hash = '#/mistakes'; return; }

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <a class="back-link" href="#/mistakes">&larr; Errores</a>
        ${window.Direction.toggleHtml()}
      </div>
    </header>
    <div id="session-container"></div>
  `;
  window.Direction.bindToggle(app, () => renderMistakesSession(content, mode));
  const container = document.getElementById('session-container');

  function onFinish(result) {
    const remaining = window.Data.collectMistakeItems(content).length;
    const scoreHtml = mode === 'listen'
      ? `<div class="results-score">✅ ${result.total} / ${result.total}</div>`
      : `<div class="results-score">${result.correct} / ${result.total}</div>
         <div class="results-pct">${result.total ? Math.round((result.correct / result.total) * 100) : 0}% correcto</div>`;
    container.innerHTML = `
      <div class="results-box">
        ${scoreHtml}
        <div class="results-pct">${remaining ? `${remaining} error${remaining > 1 ? 'es' : ''} pendiente${remaining > 1 ? 's' : ''}` : '¡Ya no quedan errores!'}</div>
        <div class="session-actions">
          ${remaining ? `<a class="btn btn-good" id="btn-repeat" href="#/mistakes/${mode}">Repetir</a>` : ''}
          <a class="btn btn-mode" href="#/mistakes">Volver a errores</a>
        </div>
      </div>
    `;
    if (remaining) {
      container.querySelector('#btn-repeat').addEventListener('click', e => {
        e.preventDefault();
        renderMistakesSession(content, mode);
      });
    }
  }

  if (mode === 'flashcards') {
    window.Exercises.runFlashcards(container, '__mistakes__', items, onFinish);
  } else if (mode === 'listen') {
    window.Exercises.runListening(container, '__mistakes__', items, onFinish);
  } else if (mode === 'quiz') {
    window.Exercises.runMultipleChoice(container, '__mistakes__', items, onFinish);
  } else if (mode === 'fillblank') {
    window.Exercises.runFillBlank(container, '__mistakes__', items, onFinish);
  } else {
    location.hash = '#/mistakes';
  }
}

function renderSession(content, subsectionId, mode) {
  const found = window.Data.findSubsection(content, subsectionId);
  if (!found) { location.hash = '#/'; return; }
  const { theme, subsection } = found;

  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <a class="back-link" href="#/theme/${theme.id}">&larr; ${subsection.title}</a>
        ${window.Direction.toggleHtml()}
      </div>
    </header>
    <div id="session-container"></div>
  `;
  window.Direction.bindToggle(app, () => renderSession(content, subsectionId, mode));
  const container = document.getElementById('session-container');

  function onFinish(result) {
    const scoreHtml = mode === 'listen'
      ? `<div class="results-score">✅ ${result.total} / ${result.total}</div>`
      : `<div class="results-score">${result.correct} / ${result.total}</div>
         <div class="results-pct">${result.total ? Math.round((result.correct / result.total) * 100) : 0}% correcto</div>`;
    container.innerHTML = `
      <div class="results-box">
        ${scoreHtml}
        <div class="session-actions">
          <a class="btn btn-good" href="#/session/${subsectionId}/${mode}">Repetir</a>
          <a class="btn btn-mode" href="#/theme/${theme.id}">Volver al tema</a>
        </div>
      </div>
    `;
    // Re-bind repeat link since hash may be unchanged (same route) -> force reload
    container.querySelector('.btn-good').addEventListener('click', e => {
      e.preventDefault();
      renderSession(content, subsectionId, mode);
    });
  }

  if (mode === 'flashcards') {
    window.Exercises.runFlashcards(container, subsectionId, subsection.items, onFinish);
  } else if (mode === 'listen') {
    window.Exercises.runListening(container, subsectionId, subsection.items, onFinish);
  } else if (mode === 'quiz') {
    window.Exercises.runMultipleChoice(container, subsectionId, subsection.items, onFinish);
  } else if (mode === 'fillblank') {
    window.Exercises.runFillBlank(container, subsectionId, subsection.items, onFinish);
  } else {
    location.hash = `#/theme/${theme.id}`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  router();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
