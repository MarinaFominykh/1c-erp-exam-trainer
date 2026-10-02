<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { grade, parseOptions } from '../study/core';
import type { Question, StudyMode } from '../study/types';

const props = defineProps<{
  question: Question;
  mode: StudyMode;
  selected?: number;
  revealed: boolean;
}>();
const emit = defineEmits<{ answer: [option: number]; reveal: [] }>();
const feedbackElement = ref<HTMLElement | null>(null);
const options = computed(() => parseOptions(props.question));
const answered = computed(() => props.selected !== undefined);
const shown = computed(() => props.mode === 'answers' || answered.value || props.revealed);
const canAnswer = computed(() => props.mode === 'practice' && !shown.value && props.question.answer_number !== null);
const feedback = computed(() => {
  if (props.mode !== 'practice') return '';
  if (answered.value) {
    const correct = grade(props.question, props.selected!);
    if (props.question.confirmed) return correct ? 'Верно.' : 'Неверно. Правильный ответ выделен.';
    return correct
      ? 'Совпадает с ключом. Ответ пока не подтвержден учебным тестированием.'
      : 'Не совпадает с ключом. Ответ в ключе пока не подтвержден учебным тестированием.';
  }
  return props.revealed ? 'Ответ открыт без проверки.' : '';
});

async function focusFeedback() {
  await nextTick();
  feedbackElement.value?.focus({ preventScroll: true });
}
function select(option: number) { emit('answer', option); void focusFeedback(); }
function reveal() { emit('reveal'); void focusFeedback(); }
</script>

<template>
  <article class="question-card" :aria-labelledby="`title-${question.id}`">
    <div class="question-meta">
      <span class="question-id">№ {{ question.id }}</span>
      <span>{{ question.section }}</span>
      <span v-if="!question.confirmed" class="badge">Не подтвержден</span>
    </div>
    <h3 :id="`title-${question.id}`" class="question-title">{{ question.question }}</h3>
    <ol class="options">
      <li v-for="option in options" :key="option.number">
        <component :is="mode === 'practice' && question.answer_number !== null ? 'button' : 'div'"
          class="option"
          :class="{ correct: shown && option.number === question.answer_number,
            wrong: mode === 'practice' && answered && selected === option.number && option.number !== question.answer_number }"
          :type="mode === 'practice' && question.answer_number !== null ? 'button' : undefined"
          :disabled="mode === 'practice' && question.answer_number !== null ? !canAnswer : undefined"
          @click="canAnswer && select(option.number)">
          <span class="option-number">{{ option.number }}</span>
          <span class="option-copy">{{ option.text }}
            <span v-if="shown && option.number === question.answer_number" class="option-mark">
              {{ question.confirmed ? '✓ Правильный ответ' : 'Ответ из ключа · не подтвержден' }}
            </span>
            <span v-else-if="mode === 'practice' && answered && selected === option.number" class="option-mark">✕ Ваш ответ</span>
          </span>
        </component>
      </li>
    </ol>
    <p v-if="question.answer_number === null" class="unknown-note">Ответ пока не определён. Самопроверка этого вопроса недоступна.</p>
    <div v-if="canAnswer" class="question-actions">
      <button type="button" class="text-button" :aria-label="`Показать ответ на вопрос ${question.id}`" @click="reveal">Показать ответ</button>
    </div>
    <p v-if="feedback" ref="feedbackElement" class="feedback"
      :class="{ good: answered && grade(question, selected!) === true,
        bad: answered && grade(question, selected!) === false }" role="status" tabindex="-1">{{ feedback }}</p>
  </article>
</template>
