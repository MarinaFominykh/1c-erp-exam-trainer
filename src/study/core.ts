import type { Option, Question, QuestionFilters, Section } from './types';

export function parseOptions(question: Question): Option[] {
  return question.options.split('\n').map((line) => {
    const match = /^(\d+)\)\s*([\s\S]*)$/.exec(line);
    if (!match) throw new Error(`Некорректный вариант: ${question.id}`);
    return { number: Number(match[1]), text: match[2] ?? '' };
  });
}

export function validateQuestions(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('База вопросов пуста');
  const ids = new Set<string>();
  for (const item of value) {
    const q = item as Question;
    if (!q || typeof q !== 'object') throw new Error('Некорректный вопрос');
    const options = parseOptions(q);
    if (ids.has(q.id) || q.id !== `${q.section_number}.${q.question_number}` ||
        !Number.isInteger(q.section_number) || !Number.isInteger(q.question_number) ||
        typeof q.section !== 'string' || !q.section ||
        typeof q.question !== 'string' || !q.question ||
        options.length < 2 || options.some((option, index) => option.number !== index + 1 || !option.text) ||
        typeof q.confirmed !== 'boolean' ||
        (q.answer_number !== null && !options.some((option) => option.number === q.answer_number)) ||
        (q.confirmed && q.answer_number === null)) {
      throw new Error(`Некорректный вопрос: ${q.id}`);
    }
    ids.add(q.id);
  }
  return value as Question[];
}

export function getSections(questions: readonly Question[]): Section[] {
  const sections = new Map<number, Section>();
  for (const q of questions) {
    const existing = sections.get(q.section_number);
    if (existing) existing.count++;
    else sections.set(q.section_number, { number: q.section_number, name: q.section, count: 1 });
  }
  return [...sections.values()].sort((a, b) => a.number - b.number);
}

const normalize = (value: string): string => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();

export function filterQuestions(questions: readonly Question[], { sections, confirmation = 'all', query = '' }: QuestionFilters): Question[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return questions.filter((q) => sections.has(q.section_number) &&
    (confirmation === 'all' || q.confirmed === (confirmation === 'confirmed')) &&
    words.every((word) => normalize(`${q.id} ${q.question} ${q.options} ${q.section}`).includes(word)));
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function grade(question: Question, selected: number): boolean | null {
  return question.answer_number === null ? null : selected === question.answer_number;
}
