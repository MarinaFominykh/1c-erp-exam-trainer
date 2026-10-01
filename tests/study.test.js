'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/study-core');
const questions = require('../1C_ERP25_2026_research_answer_key.json');
const allSections = new Set(core.getSections(questions).map(s => s.number));

test('все исходные вопросы, варианты и ответы сохранены без изменений', () => {
  const fields = ['id', 'section_number', 'section', 'question_number', 'question', 'options', 'answer_number', 'answer_text'];
  const content = questions.map(q => Object.fromEntries(fields.map(k => [k, q[k]])));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),
    '6dd4e7c12f1ee60ab74bd75e8071b068fc497fbaf0207cf7a2cd60cbb1a55969');
  assert.equal(core.validateQuestions(questions).length, 761);
  assert.equal(allSections.size, 14);
  assert.equal(core.getSections(questions).reduce((sum, s) => sum + s.count, 0), 761);
});

test('подтверждение сохранено без истории прохождений', () => {
  assert.equal(questions.filter(q => q.confirmed).length, 758);
  assert.deepEqual(questions.filter(q => !q.confirmed).map(q => q.id), ['5.29', '6.54', '9.29']);
  assert.deepEqual(Object.keys(questions[0]), ['id', 'section_number', 'section', 'question_number', 'question', 'options', 'answer_number', 'answer_text', 'confirmed']);
  assert.ok(questions.every(q => Object.keys(q).length === 9));
});

test('один раздел, комбинация разделов и пустой выбор', () => {
  const one = core.filterQuestions(questions, { sections: new Set([2]) });
  const two = core.filterQuestions(questions, { sections: new Set([5]) });
  const combination = core.filterQuestions(questions, { sections: new Set([2, 5]) });
  assert.equal(combination.length, one.length + two.length);
  assert.ok(combination.every(q => [2, 5].includes(q.section_number)));
  assert.equal(core.filterQuestions(questions, { sections: new Set() }).length, 0);
});

test('подтверждение, разделы и поиск применяются одновременно', () => {
  assert.equal(core.filterQuestions(questions, { sections: allSections, confirmation: 'confirmed' }).length, 758);
  assert.equal(core.filterQuestions(questions, { sections: allSections, confirmation: 'unconfirmed' }).length, 3);
  assert.deepEqual(core.filterQuestions(questions, { sections: new Set([5, 6]), confirmation: 'unconfirmed', query: '5.29' }).map(q => q.id), ['5.29']);
  assert.equal(core.filterQuestions(questions, { sections: new Set([6]), confirmation: 'unconfirmed', query: '5.29' }).length, 0);
  assert.equal(core.filterQuestions(questions, { sections: allSections, query: 'несуществующаяфраза' }).length, 0);
});

test('самопроверка не оценивает вопросы без ответа', () => {
  const known = questions[0];
  assert.equal(core.grade(known, known.answer_number), true);
  assert.equal(core.grade(known, known.answer_number === 1 ? 2 : 1), false);
  for (const unknown of questions.filter(q => q.answer_number === null)) {
    for (const option of core.parseOptions(unknown)) assert.equal(core.grade(unknown, option.number), null);
  }
});

test('перемешивание сохраняет все вопросы и не меняет исходный порядок', () => {
  const ids = questions.map(q => q.id);
  const shuffled = core.shuffle(questions, () => 0.25);
  assert.notDeepEqual(shuffled.map(q => q.id), ids);
  assert.deepEqual(shuffled.map(q => q.id).sort(), [...ids].sort());
  assert.deepEqual(questions.map(q => q.id), ids);
});

test('готовая страница содержит актуальную базу и работает без внешних ресурсов', () => {
  const html = fs.readFileSync(path.join(__dirname, '../1C_ERP25_2026_research_answer_key.html'), 'utf8');
  const data = html.match(/<script id="question-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(data), questions);
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)=/.test(html));
  assert.ok(!/verification_history|rejected_answers|test-progress|localStorage|sessionStorage/.test(html));
});

test('Vercel получает ту же страницу как public/index.html', () => {
  const config = require('../vercel.json');
  assert.equal(config.outputDirectory, 'public');
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert.equal(read('public/index.html'), read('1C_ERP25_2026_research_answer_key.html'));
  assert.deepEqual(fs.readdirSync(path.join(__dirname, '../public')), ['index.html']);
});
