'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateQuestions } = require('./src/study-core');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const questions = validateQuestions(JSON.parse(read('1C_ERP25_2026_research_answer_key.json')));
const replacements = {
  '/* STYLES */': read('src/study.css'),
  '/* DATA */': JSON.stringify(questions).replace(/</g, '\\u003c'),
  '/* CORE */': read('src/study-core.js'),
  '/* APP */': read('src/study-app.js'),
};
let html = read('src/page.html');
for (const [marker, content] of Object.entries(replacements)) {
  if (!html.includes(marker)) throw new Error(`Отсутствует маркер: ${marker}`);
  html = html.replace(marker, () => content);
}
fs.writeFileSync(path.join(root, '1C_ERP25_2026_research_answer_key.html'), html);
const outputDirectory = path.join(root, 'public');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'index.html'), html);
console.log(`Готово: ${questions.length} вопросов. Локальный HTML и public/index.html для хостинга.`);
