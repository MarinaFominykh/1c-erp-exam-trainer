<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SlideQuestionCard from './SlideQuestionCard.vue';
import { paginateSlides, type Slide } from '../study/slideshow';
import type { Program, Question } from '../study/types';

const props = defineProps<{ questions: readonly Question[]; program: Program }>();
const orderedQuestions = computed(() => [...props.questions].sort((a, b) => a.section_number - b.section_number || a.question_number - b.question_number));
const stage = ref<HTMLElement | null>(null);
const measureHost = ref<HTMLElement | null>(null);
const measuring = ref(false);
const measureWidth = ref(0);
const slides = ref<Slide[]>([]);
const index = ref(0);
const slideRun = ref(0);
const paused = ref(false);
const duration = ref(2000);
const overflow = ref(0);
const activeSlide = computed(() => slides.value[index.value]);
const questionCount = computed(() => activeSlide.value?.columns.flat().length ?? 0);
let timer: ReturnType<typeof setTimeout> | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let measureRun = 0;

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function scheduleNext() {
  clearTimer();
  if (paused.value || slides.value.length < 2) return;
  timer = setTimeout(() => {
    index.value = (index.value + 1) % slides.value.length;
  }, duration.value);
}

function updateTiming() {
  const slide = activeSlide.value;
  const room = stage.value?.clientHeight ?? 1;
  overflow.value = Math.max(0, (slide?.height ?? 0) - room);
  duration.value = Math.max(12000, 6000 + questionCount.value * 6500, 12000 + overflow.value * 30) / 5;
  scheduleNext();
}

function goTo(target: number) {
  if (!slides.value.length) return;
  const next = (target + slides.value.length) % slides.value.length;
  slideRun.value++;
  if (next === index.value) updateTiming();
  else index.value = next;
}

function sectionBoundary(direction: 'start' | 'end') {
  const section = activeSlide.value?.sectionNumber;
  if (section === undefined) return;
  let target = index.value;
  const step = direction === 'start' ? -1 : 1;
  while (slides.value[target + step]?.sectionNumber === section) target += step;
  goTo(target);
}

async function measure() {
  const run = ++measureRun;
  clearTimer();
  const room = stage.value?.clientHeight ?? 0;
  const width = Math.min(stage.value?.clientWidth ?? 0, 1600);
  if (!room || !width) return;
  const columns = width >= 780 ? 2 : 1;
  measureWidth.value = (width - (columns - 1) * 10) / columns;
  measuring.value = true;
  await nextTick();
  if (run !== measureRun || !measureHost.value) return;
  const heights = [...measureHost.value.querySelectorAll<HTMLElement>('.slide-card')].map((card) => Math.ceil(card.getBoundingClientRect().height));
  slides.value = paginateSlides(orderedQuestions.value, heights, room, columns, 7);
  index.value = 0;
  measuring.value = false;
  await nextTick();
  if (run === measureRun) updateTiming();
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { void measure(); }, 180);
}

watch(() => props.questions, () => { void measure(); });
watch(index, () => { updateTiming(); });
watch(paused, () => { scheduleNext(); });
onMounted(() => {
  void measure();
  window.addEventListener('resize', handleResize);
});
onBeforeUnmount(() => {
  measureRun++;
  clearTimer();
  if (resizeTimer) clearTimeout(resizeTimer);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <main class="slideshow-view" :class="{ 'is-paused': paused }" aria-label="Автоматический показ вопросов и ответов">
    <div ref="stage" class="slideshow-stage">
      <div v-if="activeSlide" :key="`${program}:${index}:${slideRun}`" class="slideshow-columns" :class="{ 'is-panning': overflow > 0 }"
        :style="{ '--slide-overflow': `${overflow}px`, '--slide-duration': `${duration}ms` }">
        <div v-for="(column, columnIndex) in activeSlide.columns" :key="columnIndex" class="slideshow-column">
          <SlideQuestionCard v-for="question in column" :key="question.id" :question="question" />
        </div>
      </div>
    </div>
    <nav class="slideshow-controls" aria-label="Управление слайд-шоу">
      <button type="button" data-action="first" aria-label="К началу всего блока" title="К началу всего блока" :disabled="!activeSlide" @click="goTo(0)"><span class="control-icon" aria-hidden="true">⏮</span><span>Всё</span></button>
      <button type="button" data-action="section-first" aria-label="К началу раздела" title="К началу раздела" :disabled="!activeSlide" @click="sectionBoundary('start')"><span class="control-icon" aria-hidden="true">⇤</span><span>Раздел</span></button>
      <button type="button" data-action="previous" aria-label="Предыдущий слайд" title="Предыдущий слайд" :disabled="!activeSlide" @click="goTo(index - 1)"><span class="control-icon" aria-hidden="true">←</span><span>Назад</span></button>
      <button type="button" data-action="pause" :aria-label="paused ? 'Продолжить показ' : 'Пауза'" :title="paused ? 'Продолжить показ' : 'Пауза'" :aria-pressed="paused" :disabled="!activeSlide" @click="paused = !paused"><span class="control-icon" aria-hidden="true">{{ paused ? '▶' : 'Ⅱ' }}</span><span>{{ paused ? 'Пуск' : 'Пауза' }}</span></button>
      <button type="button" data-action="next" aria-label="Следующий слайд" title="Следующий слайд" :disabled="!activeSlide" @click="goTo(index + 1)"><span class="control-icon" aria-hidden="true">→</span><span>Далее</span></button>
      <button type="button" data-action="section-last" aria-label="К концу раздела" title="К концу раздела" :disabled="!activeSlide" @click="sectionBoundary('end')"><span class="control-icon" aria-hidden="true">⇥</span><span>Раздел</span></button>
      <button type="button" data-action="last" aria-label="К концу всего блока" title="К концу всего блока" :disabled="!activeSlide" @click="goTo(slides.length - 1)"><span class="control-icon" aria-hidden="true">⏭</span><span>Всё</span></button>
    </nav>
    <div v-if="measuring" ref="measureHost" class="slideshow-measure" :style="{ width: `${measureWidth}px` }" aria-hidden="true">
      <SlideQuestionCard v-for="question in orderedQuestions" :key="question.id" :question="question" />
    </div>
  </main>
</template>
