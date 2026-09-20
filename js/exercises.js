// Exercise session renderers. Each takes a container element and calls onFinish({correct, total}) when done.
// itemId, recordResult, isDue come from srs.js; pickBlankWord, buildBlankSentence,
// keywordPool, shuffle come from data.js — all global top-level functions, used directly below.

function orderForSession(subsectionId, items) {
  // Due items first, then the rest, lightly shuffled within each group.
  // Items from the mistakes review carry their own original _id, so recording
  // a result there updates the same SRS entry as the source subsection.
  const withMeta = items.map((item, i) => ({ item, i, id: item._id || itemId(subsectionId, i) }));
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
function runFlashcards(container, subsectionId, items, onFinish, lockDirection) {
  const order = orderForSession(subsectionId, items);
  let pos = 0;
  let correct = 0;
  let flipped = false;

  function render() {
    const { item, id } = order[pos];
    flipped = false;
    const esToFr = (lockDirection || window.Direction.get()) === 'es-fr';
    const front = esToFr ? item.es : item.fr;
    const back = esToFr ? item.fr : item.es;
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="flashcard" id="flashcard">
        <div class="flashcard-face">
          <div class="flashcard-text">${front}</div>
          ${esToFr ? speakBtn(item.es) : ''}
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
        `<div class="flashcard-text">${front}</div><div class="flashcard-translation">${back}</div>${esToFr ? '' : speakBtn(item.es)}`;
      attachSpeakHandlers(container);
      container.querySelector('#rate-actions').hidden = false;
      window.speak(item.es);
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

// ---------- Listening (auto-plays through every card with its translation) ----------
function runListening(container, subsectionId, items, onFinish, lockDirection) {
  const order = orderForSession(subsectionId, items);
  let pos = 0;
  let playing = true;
  let token = 0;

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function cardInfo() {
    const { item } = order[pos];
    const esToFr = (lockDirection || window.Direction.get()) === 'es-fr';
    return {
      front: esToFr ? item.es : item.fr,
      back: esToFr ? item.fr : item.es,
      frontLang: esToFr ? 'es-ES' : 'fr-FR',
      backLang: esToFr ? 'fr-FR' : 'es-ES'
    };
  }

  function render() {
    const { front, back } = cardInfo();
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="flashcard" id="flashcard">
        <div class="flashcard-face">
          <div class="flashcard-text">${front}</div>
          <div class="flashcard-translation" id="listen-translation" hidden>${back}</div>
        </div>
      </div>
      <div class="session-actions">
        <button class="btn btn-mode" id="btn-prev" ${pos === 0 ? 'disabled' : ''}>⏮</button>
        <button class="btn btn-good" id="btn-toggle">${playing ? '⏸ Pausa' : '▶ Seguir'}</button>
        <button class="btn btn-mode" id="btn-next">⏭</button>
      </div>
    `;
    container.querySelector('#btn-prev').addEventListener('click', () => goTo(pos - 1));
    container.querySelector('#btn-next').addEventListener('click', () => goTo(pos + 1));
    container.querySelector('#btn-toggle').addEventListener('click', () => {
      playing = !playing;
      window.speechSynthesis.cancel();
      token += 1;
      render();
      if (playing) playSequence();
    });
  }

  async function playSequence() {
    const myToken = token;
    const { front, back, frontLang, backLang } = cardInfo();
    const stillCurrent = () => container.isConnected && token === myToken && playing;

    await window.speak(front, frontLang);
    if (!stillCurrent()) return;
    await wait(350);
    if (!stillCurrent()) return;
    const tEl = container.querySelector('#listen-translation');
    if (tEl) tEl.hidden = false;
    await window.speak(back, backLang);
    if (!stillCurrent()) return;
    await wait(900);
    if (!stillCurrent()) return;
    goTo(pos + 1);
  }

  function goTo(newPos) {
    token += 1;
    window.speechSynthesis.cancel();
    if (newPos >= order.length) {
      onFinish({ correct: order.length, total: order.length });
      return;
    }
    pos = Math.max(0, newPos);
    render();
    if (playing) playSequence();
  }

  render();
  playSequence();
}

// ---------- Multiple choice ----------
function runMultipleChoice(container, subsectionId, items, onFinish, lockDirection) {
  const order = orderForSession(subsectionId, items);
  let pos = 0;
  let correct = 0;

  function answerText(it, esToFr) {
    return esToFr ? (it.contextFr || it.fr) : (it.context || it.es);
  }

  function optionsFor(correctItem, esToFr) {
    const correctText = answerText(correctItem, esToFr);
    const pool = items.map(it => answerText(it, esToFr)).filter(text => text !== correctText);
    const distractors = shuffle(pool).slice(0, 3);
    return shuffle([correctText, ...distractors]);
  }

  function render() {
    const { item, id } = order[pos];
    const esToFr = (lockDirection || window.Direction.get()) === 'es-fr';
    const prompt = esToFr ? (item.context || item.es) : (item.contextFr || item.fr);
    const answer = answerText(item, esToFr);
    const options = optionsFor(item, esToFr);
    container.innerHTML = `
      <div class="session-progress">${progressLabel(pos, order.length)}</div>
      <div class="quiz-prompt">
        <div class="flashcard-text">${prompt}</div>
        ${esToFr ? speakBtn(item.context || item.es) : ''}
      </div>
      <div class="quiz-options">
        ${options.map(opt => `<button class="btn btn-option" data-opt="${encodeURIComponent(opt)}">${opt}</button>`).join('')}
      </div>
    `;
    attachSpeakHandlers(container);
    let solved = false;
    let hadMistake = false;
    container.querySelectorAll('.btn-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (solved || btn.disabled) return;
        const chosen = decodeURIComponent(btn.dataset.opt);
        const ok = chosen === answer;
        if (!ok) {
          hadMistake = true;
          btn.classList.add('incorrect');
          btn.disabled = true;
          return;
        }
        solved = true;
        btn.classList.add('correct');
        container.querySelectorAll('.btn-option').forEach(b => { b.disabled = true; });
        recordResult(id, !hadMistake);
        if (!hadMistake) correct += 1;
        await window.speak(item.context || item.es);
        pos += 1;
        if (pos >= order.length) onFinish({ correct, total: order.length });
        else render();
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
    let solved = false;
    let hadMistake = false;
    container.querySelectorAll('.btn-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (solved || btn.disabled) return;
        const chosen = decodeURIComponent(btn.dataset.opt);
        const ok = chosen.toLowerCase() === word.toLowerCase();
        if (!ok) {
          hadMistake = true;
          btn.classList.add('incorrect');
          btn.disabled = true;
          return;
        }
        solved = true;
        btn.classList.add('correct');
        container.querySelectorAll('.btn-option').forEach(b => { b.disabled = true; });
        recordResult(id, !hadMistake);
        if (!hadMistake) correct += 1;
        await window.speak(item.context || item.es);
        pos += 1;
        if (pos >= order.length) onFinish({ correct, total: order.length });
        else render();
      });
    });
  }

  render();
}

window.Exercises = { runFlashcards, runListening, runMultipleChoice, runFillBlank };
