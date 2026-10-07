import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import SlideshowView from '../src/components/SlideshowView.vue';
import questions from '../1C_ERP25_2026_research_answer_key.json';
import platformQuestions from '../1C_Enterprise83_questions.json';
import { filterQuestions, getSections, grade, parseOptions, shuffle, validateQuestions } from '../src/study/core';
import { paginateSlides } from '../src/study/slideshow';

const sections = getSections(validateQuestions(questions));
const allSections = new Set(sections.map((section) => section.number));

beforeAll(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(min-width: 901px)' }));
});

describe('база вопросов', () => {
  it('сохраняет исходные формулировки и ответы', () => {
    const fields = ['id', 'section_number', 'section', 'question_number', 'question', 'options', 'answer_number', 'answer_text'] as const;
    const content = questions.map((q) => Object.fromEntries(fields.map((key) => [key, q[key]])));
    expect(createHash('sha256').update(JSON.stringify(content)).digest('hex'))
      .toBe('6dd4e7c12f1ee60ab74bd75e8071b068fc497fbaf0207cf7a2cd60cbb1a55969');
    expect(questions).toHaveLength(761);
    expect(sections).toHaveLength(14);
    expect(sections.reduce((sum, section) => sum + section.count, 0)).toBe(761);
  });

  it('сохраняет статусы подтверждения без истории прохождений', () => {
    expect(questions.filter((q) => q.confirmed)).toHaveLength(758);
    expect(questions.filter((q) => !q.confirmed).map((q) => q.id)).toEqual(['5.29', '6.54', '9.29']);
    expect(Object.keys(questions[0]!)).toEqual([
      'id', 'section_number', 'section', 'question_number', 'question',
      'options', 'answer_number', 'answer_text', 'confirmed',
    ]);
  });

  it('сохраняет вопросы и ответы из файла по платформе', () => {
    const fields = ['id', 'section_number', 'section', 'question_number', 'question', 'options', 'answer_number', 'answer_text'] as const;
    const content = platformQuestions.map((q) => Object.fromEntries(fields.map((key) => [key, q[key]])));
    expect(createHash('sha256').update(JSON.stringify(content)).digest('hex'))
      .toBe('7d5d505f5c083567de39fe6807c09fe4213ff3e695d0282a17afcc72ede73847');
    expect(validateQuestions(platformQuestions)).toHaveLength(961);
    expect(platformQuestions.every((q) => q.answer_number !== null && !q.confirmed)).toBe(true);
  });
});

describe('подготовка', () => {
  it('раскладывает все вопросы по слайдам в порядке разделов без потерь и обрезания длинных карточек', () => {
    const sample = questions.slice(0, 5);
    const slides = paginateSlides(sample, [120, 120, 340, 120, 120], 300, 2);
    expect(slides.flatMap((slide) => slide.columns.flat().map((question) => question.id)))
      .toEqual(sample.map((question) => question.id));
    expect(slides.some((slide) => slide.height > 300)).toBe(true);
    const sectionChange = paginateSlides([questions[0]!, questions.find((question) => question.section_number === 2)!], [100, 100], 300, 2);
    expect(sectionChange).toHaveLength(2);
  });

  it('совмещает разделы, подтверждение и поиск', () => {
    expect(filterQuestions(questions, { sections: new Set([2, 5]) })).toHaveLength(
      filterQuestions(questions, { sections: new Set([2]) }).length +
      filterQuestions(questions, { sections: new Set([5]) }).length,
    );
    expect(filterQuestions(questions, { sections: new Set() })).toHaveLength(0);
    expect(filterQuestions(questions, { sections: allSections, confirmation: 'confirmed' })).toHaveLength(758);
    expect(filterQuestions(questions, { sections: allSections, confirmation: 'unconfirmed' })).toHaveLength(3);
    expect(filterQuestions(questions, { sections: new Set([5, 6]), confirmation: 'unconfirmed', query: '5.29' }).map((q) => q.id)).toEqual(['5.29']);
    expect(filterQuestions(questions, { sections: allSections, query: 'несуществующаяфраза' })).toHaveLength(0);
  });

  it('не оценивает вопросы без ответа', () => {
    expect(grade(questions[0]!, questions[0]!.answer_number!)).toBe(true);
    for (const question of questions.filter((q) => q.answer_number === null)) {
      for (const option of parseOptions(question)) expect(grade(question, option.number)).toBeNull();
    }
  });

  it('перемешивает без изменения исходного порядка', () => {
    const ids = questions.map((q) => q.id);
    expect(shuffle(questions, () => 0.25).map((q) => q.id)).not.toEqual(ids);
    expect(questions.map((q) => q.id)).toEqual(ids);
  });
});

describe('интерфейс', () => {
  it('показывает несколько вопросов на мобильном слайде и повторяет показ без клика', async () => {
    vi.useFakeTimers();
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390);
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(220);
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect);
    const wrapper = mount(SlideshowView, { props: { questions: questions.slice(0, 3), program: 'erp' } });
    try {
      await nextTick();
      await nextTick();
      await nextTick();
      expect(wrapper.findAll('.slide-card-number').map((card) => card.text())).toEqual(['Вопрос 1.1', 'Вопрос 1.2']);
      expect(wrapper.find('.slideshow-topbar').exists()).toBe(false);
      expect(wrapper.find('.slideshow-footer').exists()).toBe(false);
      await vi.advanceTimersByTimeAsync(3800);
      expect(wrapper.findAll('.slide-card-number').map((card) => card.text())).toEqual(['Вопрос 1.3']);
      await vi.advanceTimersByTimeAsync(2500);
      expect(wrapper.findAll('.slide-card-number').map((card) => card.text())).toEqual(['Вопрос 1.1', 'Вопрос 1.2']);
    } finally {
      wrapper.unmount();
      width.mockRestore();
      height.mockRestore();
      rect.mockRestore();
      vi.useRealTimers();
    }
  });

  it('управляет показом и переходит к границам текущего раздела и всего блока', async () => {
    vi.useFakeTimers();
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390);
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(220);
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect);
    const sectionTwo = questions.filter((question) => question.section_number === 2).slice(0, 3);
    const wrapper = mount(SlideshowView, { props: { questions: [...questions.slice(0, 3), ...sectionTwo], program: 'erp' } });
    const shown = () => wrapper.findAll('.slide-card-number').map((card) => card.text());
    const click = async (action: string) => wrapper.find(`[data-action="${action}"]`).trigger('click');
    try {
      await nextTick();
      await nextTick();
      await nextTick();
      expect(shown()).toEqual(['Вопрос 1.1', 'Вопрос 1.2']);
      expect(wrapper.findAll('.slideshow-controls button')).toHaveLength(7);
      await click('section-last');
      expect(shown()).toEqual(['Вопрос 1.3']);
      await click('next');
      expect(shown()).toEqual(sectionTwo.slice(0, 2).map((question) => `Вопрос ${question.id}`));
      await click('section-last');
      expect(shown()).toEqual([`Вопрос ${sectionTwo[2]!.id}`]);
      await click('section-first');
      expect(shown()).toEqual(sectionTwo.slice(0, 2).map((question) => `Вопрос ${question.id}`));
      await click('last');
      expect(shown()).toEqual([`Вопрос ${sectionTwo[2]!.id}`]);
      await click('first');
      expect(shown()).toEqual(['Вопрос 1.1', 'Вопрос 1.2']);
      await click('previous');
      expect(shown()).toEqual([`Вопрос ${sectionTwo[2]!.id}`]);
      await click('pause');
      expect(wrapper.find('[data-action="pause"]').attributes('aria-pressed')).toBe('true');
      await vi.advanceTimersByTimeAsync(5000);
      expect(shown()).toEqual([`Вопрос ${sectionTwo[2]!.id}`]);
      await click('pause');
      await vi.advanceTimersByTimeAsync(2500);
      expect(shown()).toEqual(['Вопрос 1.1', 'Вопрос 1.2']);
    } finally {
      wrapper.unmount();
      width.mockRestore();
      height.mockRestore();
      rect.mockRestore();
      vi.useRealTimers();
    }
  });

  it('переключает программу и сбрасывает состояние подготовки', async () => {
    const wrapper = mount(App);
    await wrapper.findAll('.mode-switch button')[1]!.trigger('click');
    await wrapper.find('.question-card button.option').trigger('click');
    await wrapper.find('input[type="search"]').setValue('несуществующаяфраза');
    await wrapper.find('.program-picker select').setValue('platform');
    expect(wrapper.find('.totals').text()).toContain('961 вопросов');
    expect(wrapper.findAll('.question-card')).toHaveLength(20);
    expect(wrapper.find('.question-card .question-title').text()).toBe(platformQuestions[0]!.question);
    expect(wrapper.find('.sections-panel').exists()).toBe(false);
    expect(wrapper.find('.mode-switch button[aria-pressed="true"]').text()).toBe('Показать ответы');
    expect(wrapper.find('input[type="search"]').element).toHaveProperty('value', '');
    await wrapper.findAll('.mode-switch button')[1]!.trigger('click');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 0');
    await wrapper.find('.question-card button.option').trigger('click');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 1');
    await wrapper.find('.program-picker select').setValue('erp');
    expect(wrapper.find('.totals').text()).toContain('761 вопросов');
    expect(wrapper.find('.sections-panel').exists()).toBe(true);
  });

  it('показывает вопросы и сбрасывает результат при смене режима', async () => {
    const wrapper = mount(App);
    expect(wrapper.findAll('.question-card')).toHaveLength(20);
    await wrapper.findAll('.mode-switch button')[1]!.trigger('click');
    await wrapper.find('.question-card button.option').trigger('click');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 1');
    await wrapper.findAll('.mode-switch button')[0]!.trigger('click');
    await wrapper.findAll('.mode-switch button')[1]!.trigger('click');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 0');
  });

  it('применяет фильтр и показывает пустую выборку', async () => {
    const wrapper = mount(App);
    await wrapper.find('input[type="search"]').setValue('несуществующаяфраза');
    expect(wrapper.find('.empty').exists()).toBe(true);
    await wrapper.find('.empty button').trigger('click');
    expect(wrapper.findAll('.question-card')).toHaveLength(20);
  });

  it('сохраняет результат самопроверки при смене фильтра', async () => {
    const wrapper = mount(App);
    await wrapper.findAll('.mode-switch button')[1]!.trigger('click');
    await wrapper.find('.question-card button.option').trigger('click');
    await wrapper.find('input[type="search"]').setValue('несуществующаяфраза');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 0');
    await wrapper.find('input[type="search"]').setValue('');
    expect(wrapper.find('.practice-score').text()).toContain('отвечено 1');
  });
});

describe('автономная сборка', () => {
  it('создаёт одинаковые страницы без внешних ресурсов', () => {
    const read = (file: string) => readFileSync(resolve(file), 'utf8');
    const html = read('1C_ERP25_2026_research_answer_key.html');
    expect(read('public/index.html')).toBe(html);
    expect(html).toContain('id="app"');
    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=/);
    expect(html).not.toMatch(/verification_history|rejected_answers|test-progress|localStorage|sessionStorage/);
  });
});
