import { computed, ref, shallowRef, watch } from 'vue';
import { filterQuestions, getSections, grade, shuffle, validateQuestions } from './core';
import type { Confirmation, Program, Question, StudyMode } from './types';
import erpData from '../../1C_ERP25_2026_research_answer_key.json';
import platformData from '../../1C_Enterprise83_questions.json';

export const PAGE_SIZE = 20;
const questionBanks: Record<Program, Question[]> = {
  erp: validateQuestions(erpData),
  platform: validateQuestions(platformData),
};

export function useStudySession() {
  const program = ref<Program>('erp');
  const questions = computed(() => questionBanks[program.value]);
  const sections = computed(() => getSections(questions.value));
  const selectedSections = ref(new Set(sections.value.map((section) => section.number)));
  const confirmation = ref<Confirmation>('all');
  const query = ref('');
  const mode = ref<StudyMode>('answers');
  const page = ref(1);
  const ordered = shallowRef<readonly Question[]>(questions.value);
  const isShuffled = ref(false);
  const answers = ref(new Map<string, number>());
  const revealed = ref(new Set<string>());

  const filtered = computed(() => filterQuestions(ordered.value, {
    sections: selectedSections.value,
    confirmation: confirmation.value,
    query: query.value,
  }));
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));
  const pageQuestions = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
  const score = computed(() => {
    let answered = 0;
    let correct = 0;
    let opened = 0;
    for (const question of filtered.value) {
      const selected = answers.value.get(question.id);
      if (selected !== undefined) {
        answered++;
        if (grade(question, selected)) correct++;
      } else if (revealed.value.has(question.id)) opened++;
    }
    return { answered, correct, errors: answered - correct, opened };
  });

  watch([selectedSections, confirmation, query, ordered], () => { page.value = 1; });

  function selectSection(number: number, selected: boolean) {
    const next = new Set(selectedSections.value);
    if (selected) next.add(number);
    else next.delete(number);
    selectedSections.value = next;
  }

  function selectAllSections() { selectedSections.value = new Set(sections.value.map((section) => section.number)); }
  function clearSections() { selectedSections.value = new Set(); }

  function resetFilters() {
    selectAllSections();
    query.value = '';
    confirmation.value = 'all';
  }

  function resetPractice() {
    answers.value = new Map();
    revealed.value = new Set();
    page.value = 1;
  }

  function setMode(next: StudyMode) {
    if (mode.value === next) return;
    mode.value = next;
    resetPractice();
  }

  function setProgram(next: Program) {
    if (program.value === next) return;
    program.value = next;
    ordered.value = questions.value;
    selectedSections.value = new Set(sections.value.map((section) => section.number));
    confirmation.value = 'all';
    query.value = '';
    mode.value = 'answers';
    isShuffled.value = false;
    resetPractice();
  }

  function answer(question: Question, option: number) {
    if (mode.value !== 'practice' || question.answer_number === null ||
        answers.value.has(question.id) || revealed.value.has(question.id)) return;
    answers.value = new Map(answers.value).set(question.id, option);
  }

  function reveal(question: Question) {
    if (mode.value !== 'practice' || question.answer_number === null ||
        answers.value.has(question.id) || revealed.value.has(question.id)) return;
    revealed.value = new Set(revealed.value).add(question.id);
  }

  function shuffleQuestions() {
    ordered.value = shuffle(ordered.value);
    isShuffled.value = true;
  }

  function restoreOrder() {
    ordered.value = questions.value;
    isShuffled.value = false;
  }

  return {
    program, questions, sections, selectedSections, confirmation, query, mode, page,
    filtered, pageCount, pageQuestions, score, answers, revealed, isShuffled,
    selectSection, selectAllSections, clearSections, resetFilters, resetPractice,
    setProgram, setMode, answer, reveal, shuffleQuestions, restoreOrder,
  };
}
