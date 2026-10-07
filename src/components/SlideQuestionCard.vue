<script setup lang="ts">
import { computed } from 'vue';
import { parseOptions } from '../study/core';
import type { Question } from '../study/types';

const props = defineProps<{ question: Question }>();
const options = computed(() => parseOptions(props.question));
</script>

<template>
  <article class="slide-card">
    <div class="slide-card-number">Вопрос {{ question.id }}</div>
    <h3>{{ question.question }}</h3>
    <ol class="slide-options">
      <li v-for="option in options" :key="option.number" :class="{ 'is-correct': option.number === question.answer_number }">
        <span class="slide-option-number">{{ option.number }}</span>
        <span class="slide-option-text">{{ option.text }}</span>
        <span v-if="option.number === question.answer_number" class="slide-correct-label">{{ question.confirmed ? '✓ Верный' : '✓ Из ключа' }}</span>
      </li>
    </ol>
    <p v-if="question.answer_number === null" class="slide-unknown">Правильный ответ пока не определён</p>
  </article>
</template>
