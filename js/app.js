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
  } else {
    renderHome(content);
  }
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
  app.innerHTML = `
    <header class="app-header">
      <h1>Español con Astrid</h1>
      <p class="subtitle">Elige un tema para practicar</p>
    </header>
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
}

function renderTheme(content, themeId) {
  const theme = window.Data.findTheme(content, themeId);
  if (!theme) { location.hash = '#/'; return; }

  app.innerHTML = `
    <header class="app-header">
      <a class="back-link" href="#/">&larr; Temas</a>
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
        const modes = sub.kind === 'vocab'
          ? [['flashcards', 'Tarjetas'], ['quiz', 'Opción múltiple']]
          : [['flashcards', 'Tarjetas'], ['quiz', 'Opción múltiple'], ['fillblank', 'Completar']];
        return `
          <div class="subsection-card">
            <div class="subsection-title">${sub.title}</div>
            <div class="subsection-meta">${p.mastered} / ${p.total} dominadas ${p.due ? `· ${p.due} para repasar` : ''}</div>
            <div class="mode-buttons">
              ${modes.map(([mode, label]) => `<a class="btn btn-mode" href="#/session/${sub.id}/${mode}">${label}</a>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSession(content, subsectionId, mode) {
  const found = window.Data.findSubsection(content, subsectionId);
  if (!found) { location.hash = '#/'; return; }
  const { theme, subsection } = found;

  app.innerHTML = `
    <header class="app-header">
      <a class="back-link" href="#/theme/${theme.id}">&larr; ${subsection.title}</a>
    </header>
    <div id="session-container"></div>
  `;
  const container = document.getElementById('session-container');

  function onFinish(result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0;
    container.innerHTML = `
      <div class="results-box">
        <div class="results-score">${result.correct} / ${result.total}</div>
        <div class="results-pct">${pct}% correcto</div>
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
