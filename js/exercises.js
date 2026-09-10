// Exercise session renderers. Each takes a container element and calls onFinish({correct, total}) when done.
// itemId, recordResult, isDue come from srs.js; pickBlankWord, buildBlankSentence,
// keywordPool, shuffle come from data.js — all global top-level functions, used directly below.

function orderForSession(subsectionId, items) {
  // Due items first, then the rest, lightly shuffled within each group.
  const withMeta = items.map((item, i) => ({ item, i, id: itemId(subsectionId, i) }));
  const due = withMeta.filter(x => window.SRS.isDue(x.id));
  const notDue = withMeta.filter(x => !window.SRS.isDue(x.id));
  return shuffle(due).concat(shuffle(notDue));
}

function speakBtn(text) {
  return `<button class="speak-btn" data-speak="${encodeURIComponent(text)}" aria-label="Escuchar">🔊</button>`;
}

function progressLabel(pos, total) {
  return `${pos + 1} / ${total}`;
}

function attachSpeakHandlers(container) {
  container.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      window.speak(decodeURIComponent(btn.dataset.speak));
    });
  });
}

// ---------- Flashcards ----------
function runFlashcards(container, subsectionId, items, onFinish) {
  const order = orderForSession(subsectionId, items);
  let pos = 0;
  let correct = 0;
  let flipped = false;

  function render() {
    const { item, id } = order[pos];
    flipped = false;
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="flashcard" id="flashcard">
        <div class="flashcard-face">
          <div class="flashcard-text">${item.es}</div>
          ${speakBtn(item.es)}
          <div class="flashcard-hint">Toca la tarjeta para ver la traducción</div>
        </div>
      </div>
      <div class="session-actions" id="rate-actions" hidden>
        <button class="btn btn-bad" id="btn-no">❌ No sabía</button>
        <button class="btn btn-good" id="btn-yes">✅ Sabía</button>
      </div>
    `;
    attachSpeakHandlers(container);
    const card = container.querySelector('#flashcard');
    card.addEventListener('click', () => {
      if (flipped) return;
      flipped = true;
      card.querySelector('.flashcard-text').outerHTML =
        `<div class="flashcard-text">${item.es}</div><div class="flashcard-translation">${item.fr}</div>`;
      container.querySelector('#rate-actions').hidden = false;
    });
    container.querySelector('#btn-no').addEventListener('click', () => answer(id, false));
    container.querySelector('#btn-yes').addEventListener('click', () => answer(id, true));
  }

  function answer(id, ok) {
    recordResult(id, ok);
    if (ok) correct += 1;
    pos += 1;
    if (pos >= order.length) {
      onFinish({ correct, total: order.length });
    } else {
      render();
    }
  }

  render();
}

// ---------- Multiple choice ----------
function runMultipleChoice(container, subsectionId, items, onFinish) {
  const order = orderForSession(subsectionId, items);
  let pos = 0;
  let correct = 0;

  function optionsFor(correctItem) {
    const pool = items.filter(it => it.fr !== correctItem.fr).map(it => it.fr);
    const distractors = shuffle(pool).slice(0, 3);
    return shuffle([correctItem.fr, ...distractors]);
  }

  function render() {
    const { item, id } = order[pos];
    const options = optionsFor(item);
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="quiz-prompt">
        <div class="flashcard-text">${item.es}</div>
        ${speakBtn(item.es)}
      </div>
      <div class="quiz-options">
        ${options.map(opt => `<button class="btn btn-option" data-opt="${encodeURIComponent(opt)}">${opt}</button>`).join('')}
      </div>
    `;
    attachSpeakHandlers(container);
    let answered = false;
    container.querySelectorAll('.btn-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = decodeURIComponent(btn.dataset.opt);
        const ok = chosen === item.fr;
        btn.classList.add(ok ? 'correct' : 'incorrect');
        if (!ok) {
          container.querySelectorAll('.btn-option').forEach(b => {
            if (decodeURIComponent(b.dataset.opt) === item.fr) b.classList.add('correct');
          });
        }
        recordResult(id, ok);
        if (ok) correct += 1;
        setTimeout(() => {
          pos += 1;
          if (pos >= order.length) onFinish({ correct, total: order.length });
          else render();
        }, 700);
      });
    });
  }

  render();
}

// ---------- Fill in the blank ----------
function runFillBlank(container, subsectionId, items, onFinish) {
  const usable = items.filter(it => pickBlankWord(it));
  const order = orderForSession(subsectionId, usable);
  const pool = keywordPool(usable);
  let pos = 0;
  let correct = 0;

  function optionsFor(word) {
    const candidates = shuffle(pool.filter(w => w.toLowerCase() !== word.toLowerCase())).slice(0, 3);
    return shuffle([word, ...candidates]);
  }

  function render() {
    const { item, id } = order[pos];
    const word = pickBlankWord(item);
    const blanked = buildBlankSentence(item, word);
    const options = optionsFor(word);
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="quiz-prompt">
        <div class="flashcard-text">${blanked}</div>
        <div class="flashcard-translation">${item.fr}</div>
      </div>
      <div class="quiz-options">
        ${options.map(opt => `<button class="btn btn-option" data-opt="${encodeURIComponent(opt)}">${opt}</button>`).join('')}
      </div>
    `;
    let answered = false;
    container.querySelectorAll('.btn-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = decodeURIComponent(btn.dataset.opt);
        const ok = chosen.toLowerCase() === word.toLowerCase();
        btn.classList.add(ok ? 'correct' : 'incorrect');
        if (!ok) {
          container.querySelectorAll('.btn-option').forEach(b => {
            if (decodeURIComponent(b.dataset.opt).toLowerCase() === word.toLowerCase()) b.classList.add('correct');
          });
        }
        recordResult(id, ok);
        if (ok) correct += 1;
        setTimeout(() => {
          pos += 1;
          if (pos >= order.length) onFinish({ correct, total: order.length });
          else render();
        }, 700);
      });
    });
  }

  render();
}

window.Exercises = { runFlashcards, runMultipleChoice, runFillBlank };
