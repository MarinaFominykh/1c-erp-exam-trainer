(() => {
  'use strict';
  const core = window.StudyCore;
  const questions = core.validateQuestions(JSON.parse(document.getElementById('question-data').textContent));
  const sections = core.getSections(questions);
  const byId = new Map(questions.map(q => [q.id, q]));
  const pageSize = 20;
  const state = {
    sections: new Set(sections.map(s => s.number)), confirmation: 'all', query: '',
    mode: 'answers', page: 1, order: questions, answers: new Map(), revealed: new Set(),
  };
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  $('total-count').textContent = questions.length;
  $('section-count').textContent = sections.length;
  $('sections-panel').open = window.matchMedia('(min-width: 901px)').matches;
  $('section-options').insertAdjacentHTML('beforeend', sections.map(s => `
    <label class="section-option"><input type="checkbox" value="${s.number}" checked>
      <span class="section-name"><span class="section-number">${s.number}.</span> ${escape(s.name)}</span>
      <span class="section-total" aria-label="${s.count} вопросов">${s.count}</span></label>`).join(''));

  function renderQuestion(q) {
    const practicing = state.mode === 'practice';
    const selected = state.answers.get(q.id);
    const answered = selected !== undefined;
    const shown = !practicing || answered || state.revealed.has(q.id);
    const canAnswer = practicing && !shown && q.answer_number !== null;
    const options = core.parseOptions(q).map(o => {
      const correct = shown && o.number === q.answer_number;
      const wrong = practicing && answered && selected === o.number && !correct;
      const tag = practicing && q.answer_number !== null ? 'button' : 'div';
      const attributes = tag === 'button' ? ` type="button" data-answer="${o.number}"${canAnswer ? '' : ' disabled'}` : '';
      const mark = correct ? (q.confirmed ? '✓ Правильный ответ' : 'Ответ из ключа · не подтвержден') : (wrong ? '✕ Ваш ответ' : '');
      return `<li><${tag} class="option${correct ? ' correct' : ''}${wrong ? ' wrong' : ''}"${attributes}><span class="option-number">${o.number}</span><span class="option-copy">${escape(o.text)}${mark ? `<span class="option-mark">${mark}</span>` : ''}</span></${tag}></li>`;
    }).join('');
    let feedback = '';
    if (practicing && answered) {
      const correct = core.grade(q, selected);
      feedback = `<p class="feedback ${correct ? 'good' : 'bad'}" role="status">${q.confirmed ? (correct ? 'Верно.' : 'Неверно. Правильный ответ выделен.') : (correct ? 'Совпадает с ключом. Ответ пока не подтвержден учебным тестированием.' : 'Не совпадает с ключом. Ответ в ключе пока не подтвержден учебным тестированием.')}</p>`;
    } else if (practicing && state.revealed.has(q.id)) {
      feedback = '<p class="feedback" role="status">Ответ открыт без проверки.</p>';
    }
    return `<article class="question-card" data-id="${q.id}" aria-labelledby="title-${q.id}">
      <div class="question-meta"><span class="question-id">№ ${q.id}</span><span>${escape(q.section)}</span>${q.confirmed ? '' : '<span class="badge">Не подтвержден</span>'}</div>
      <h3 class="question-title" id="title-${q.id}">${escape(q.question)}</h3>
      <ol class="options">${options}</ol>
      ${q.answer_number === null ? '<p class="unknown-note">Ответ пока не определён. Самопроверка этого вопроса недоступна.</p>' : ''}
      ${canAnswer ? `<div class="question-actions"><button type="button" class="text-button" data-reveal aria-label="Показать ответ на вопрос ${q.id}">Показать ответ</button></div>` : ''}
      ${feedback}</article>`;
  }

  function renderScore(filtered) {
    let answered = 0, correct = 0, revealed = 0;
    for (const q of filtered) {
      if (state.answers.has(q.id)) { answered++; if (core.grade(q, state.answers.get(q.id))) correct++; }
      else if (state.revealed.has(q.id)) revealed++;
    }
    $('practice-score').textContent = `В текущей выборке: отвечено ${answered} · совпало с ключом ${correct} · ошибок ${answered - correct}${revealed ? ` · открыто без проверки ${revealed}` : ''}`;
  }

  function render() {
    const filtered = core.filterQuestions(state.order, state);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    $('questions').innerHTML = filtered.slice(start, start + pageSize).map(renderQuestion).join('');
    $('empty').hidden = filtered.length !== 0;
    $('pagination').hidden = filtered.length <= pageSize;
    $('previous').disabled = state.page === 1;
    $('next').disabled = state.page === pages;
    $('page-label').textContent = `${state.page} / ${pages}`;
    $('result-count').textContent = filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} из ${filtered.length} вопросов` : '0 вопросов';
    $('selected-count').textContent = `${state.sections.size} / ${sections.length}`;
    $('shuffle').disabled = filtered.length < 2;
    renderScore(filtered);
  }

  function filtersChanged() { state.page = 1; render(); }
  function updateSectionInputs() {
    $('section-options').querySelectorAll('input').forEach(input => { input.checked = state.sections.has(Number(input.value)); });
  }
  function setMode(mode) {
    state.mode = mode;
    const practicing = mode === 'practice';
    // Starting or leaving practice clears this session, including answers that were revealed.
    state.answers.clear();
    state.revealed.clear();
    $('answers-mode').setAttribute('aria-pressed', String(!practicing));
    $('practice-mode').setAttribute('aria-pressed', String(practicing));
    $('reset-practice').hidden = !practicing;
    $('practice-score').hidden = !practicing;
    $('mode-hint').textContent = practicing ? 'Выберите вариант ответа. Результаты хранятся только до закрытия страницы или смены режима.' : 'Ответ из ключа выделен в каждом вопросе.';
    render();
  }
  $('answers-mode').addEventListener('click', () => { if (state.mode !== 'answers') setMode('answers'); });
  $('practice-mode').addEventListener('click', () => { if (state.mode !== 'practice') setMode('practice'); });
  $('section-options').addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('input[type="checkbox"]')) return;
    if (input.checked) state.sections.add(Number(input.value));
    else state.sections.delete(Number(input.value));
    filtersChanged();
  });
  $('all-sections').addEventListener('click', () => { state.sections = new Set(sections.map(s => s.number)); updateSectionInputs(); filtersChanged(); });
  $('no-sections').addEventListener('click', () => { state.sections.clear(); updateSectionInputs(); filtersChanged(); });
  $('search').addEventListener('input', event => { state.query = event.target.value; filtersChanged(); });
  $('confirmation').addEventListener('change', event => { state.confirmation = event.target.value; filtersChanged(); });
  $('shuffle').addEventListener('click', () => { state.order = core.shuffle(state.order); $('ordered').hidden = false; filtersChanged(); });
  $('ordered').addEventListener('click', () => { state.order = questions; $('ordered').hidden = true; filtersChanged(); });
  $('reset-practice').addEventListener('click', () => { state.answers.clear(); state.revealed.clear(); state.page = 1; render(); });
  $('reset-filters').addEventListener('click', () => {
    state.sections = new Set(sections.map(s => s.number)); state.query = ''; state.confirmation = 'all';
    $('search').value = ''; $('confirmation').value = 'all'; updateSectionInputs(); filtersChanged();
  });
  $('questions').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || state.mode !== 'practice') return;
    const card = button.closest('.question-card');
    const q = byId.get(card.dataset.id);
    if (!q || q.answer_number === null || state.answers.has(q.id) || state.revealed.has(q.id)) return;
    if (button.hasAttribute('data-answer')) state.answers.set(q.id, Number(button.dataset.answer));
    else if (button.hasAttribute('data-reveal')) state.revealed.add(q.id);
    else return;
    // Replace only this card so a long list stays in place after an answer.
    card.outerHTML = renderQuestion(q);
    const updated = $('questions').querySelector(`[data-id="${q.id}"]`);
    const feedback = updated.querySelector('.feedback');
    feedback.tabIndex = -1;
    feedback.focus({ preventScroll: true });
    renderScore(core.filterQuestions(state.order, state));
  });
  function changePage(delta) {
    state.page += delta; render();
    $('questions-heading').focus({ preventScroll: true });
    $('questions-heading').scrollIntoView({ block: 'start' });
  }
  $('previous').addEventListener('click', () => changePage(-1));
  $('next').addEventListener('click', () => changePage(1));
  render();
})();
