(function (root) {
  'use strict';

  function validateQuestions(questions) {
    const ids = new Set();
    if (!Array.isArray(questions) || !questions.length) throw new Error('База вопросов пуста');
    for (const q of questions) {
      const options = parseOptions(q);
      if (ids.has(q.id) || q.id !== `${q.section_number}.${q.question_number}` ||
          !Number.isInteger(q.section_number) || !Number.isInteger(q.question_number) ||
          !q.section || !q.question || options.length < 2 ||
          options.some((o, i) => o.number !== i + 1 || !o.text) ||
          typeof q.confirmed !== 'boolean' ||
          (q.answer_number !== null && !options.some(o => o.number === q.answer_number)) ||
          (q.confirmed && q.answer_number === null)) {
        throw new Error(`Некорректный вопрос: ${q.id}`);
      }
      ids.add(q.id);
    }
    return questions;
  }

  function parseOptions(question) {
    return question.options.split('\n').map(line => {
      const match = /^(\d+)\)\s*([\s\S]*)$/.exec(line);
      if (!match) throw new Error(`Некорректный вариант: ${question.id}`);
      return { number: Number(match[1]), text: match[2] };
    });
  }

  function getSections(questions) {
    const sections = new Map();
    for (const q of questions) {
      if (!sections.has(q.section_number)) {
        sections.set(q.section_number, { number: q.section_number, name: q.section, count: 0 });
      }
      sections.get(q.section_number).count++;
    }
    return [...sections.values()].sort((a, b) => a.number - b.number);
  }

  const normalize = value => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();

  function filterQuestions(questions, { sections, confirmation = 'all', query = '' }) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return questions.filter(q => sections.has(q.section_number) &&
      (confirmation === 'all' || q.confirmed === (confirmation === 'confirmed')) &&
      words.every(word => normalize(`${q.id} ${q.question} ${q.options} ${q.section}`).includes(word)));
  }

  function shuffle(questions, random = Math.random) {
    const result = [...questions];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function grade(question, selected) {
    if (question.answer_number === null) return null;
    return selected === question.answer_number;
  }

  const api = { validateQuestions, parseOptions, getSections, filterQuestions, shuffle, grade };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StudyCore = api;
})(globalThis);
