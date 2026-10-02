<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import SectionFilter from './components/SectionFilter.vue';
import QuestionCard from './components/QuestionCard.vue';
import { PAGE_SIZE, useStudySession } from './study/useStudySession';

const session = useStudySession();
const heading = ref<HTMLElement | null>(null);
const resultCount = computed(() => {
  const count = session.filtered.value.length;
  if (!count) return '0 вопросов';
  const first = (session.page.value - 1) * PAGE_SIZE + 1;
  return `${first}–${Math.min(first + PAGE_SIZE - 1, count)} из ${count} вопросов`;
});
const scoreText = computed(() => {
  const { answered, correct, errors, opened } = session.score.value;
  return `В текущей выборке: отвечено ${answered} · совпало с ключом ${correct} · ошибок ${errors}${opened ? ` · открыто без проверки ${opened}` : ''}`;
});

async function changePage(delta: number) {
  session.page.value += delta;
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  heading.value?.scrollIntoView({ block: 'start' });
}
</script>

<template>
  <a class="skip-link" href="#questions-heading">Перейти к вопросам</a>
  <header class="header">
    <div class="header-inner">
      <div class="brand"><span class="brand-icon" aria-hidden="true">1С</span><span>ПРОФЕССИОНАЛ <span class="brand-divider">/</span> ERP 2.5</span></div>
      <h1>Подготовка к тестированию</h1>
      <p>Изучайте ответы и проверяйте себя в удобном темпе.</p>
      <div class="totals"><span><strong>{{ session.questions.length }}</strong> вопросов</span><span><strong>{{ session.sections.length }}</strong> разделов</span><span>Комплект 2026 года</span></div>
    </div>
  </header>
  <main class="layout">
    <aside>
      <SectionFilter :sections="session.sections" :selected="session.selectedSections.value"
        @change="session.selectSection" @select-all="session.selectAllSections" @clear="session.clearSections" />
    </aside>
    <div class="workspace">
      <section class="panel toolbar" aria-label="Настройки подготовки">
        <div class="mode-switch" role="group" aria-label="Режим подготовки">
          <button type="button" :aria-pressed="session.mode.value === 'answers'" @click="session.setMode('answers')">Показать ответы</button>
          <button type="button" :aria-pressed="session.mode.value === 'practice'" @click="session.setMode('practice')">Самопроверка</button>
        </div>
        <p class="mode-hint">{{ session.mode.value === 'practice'
          ? 'Выберите вариант ответа. Результаты хранятся только до закрытия страницы или смены режима.'
          : 'Ответ из ключа выделен в каждом вопросе.' }}</p>
        <div class="filters">
          <label>Поиск<input v-model="session.query.value" type="search" placeholder="Номер или текст вопроса" autocomplete="off" /></label>
          <label>Подтверждение ответа<select v-model="session.confirmation.value">
            <option value="all">Все вопросы</option>
            <option value="confirmed">Только подтвержденные</option>
            <option value="unconfirmed">Только неподтвержденные</option>
          </select></label>
        </div>
        <div class="toolbar-bottom">
          <div class="order-actions">
            <button type="button" class="secondary" :disabled="session.filtered.value.length < 2" @click="session.shuffleQuestions">Перемешать вопросы</button>
            <button v-if="session.isShuffled.value" type="button" class="text-button" @click="session.restoreOrder">По порядку</button>
          </div>
          <button v-if="session.mode.value === 'practice'" type="button" class="text-button" @click="session.resetPractice">Начать заново</button>
        </div>
        <p v-if="session.mode.value === 'practice'" class="practice-score" role="status">{{ scoreText }}</p>
      </section>
      <div class="list-heading"><h2 id="questions-heading" ref="heading" tabindex="-1">Вопросы</h2><span id="result-count" role="status">{{ resultCount }}</span></div>
      <div id="questions">
        <QuestionCard v-for="question in session.pageQuestions.value" :key="question.id"
          :question="question" :mode="session.mode.value"
          :selected="session.answers.value.get(question.id)"
          :revealed="session.revealed.value.has(question.id)"
          @answer="session.answer(question, $event)" @reveal="session.reveal(question)" />
      </div>
      <div v-if="!session.filtered.value.length" class="panel empty">
        <h3>Вопросов не найдено</h3><p>Выберите разделы или измените условия поиска.</p>
        <button type="button" class="secondary" @click="session.resetFilters">Сбросить фильтры</button>
      </div>
      <nav v-if="session.filtered.value.length > PAGE_SIZE" class="pagination" aria-label="Страницы вопросов">
        <button type="button" class="secondary" :disabled="session.page.value === 1" @click="changePage(-1)">← Назад</button>
        <span id="page-label">{{ session.page.value }} / {{ session.pageCount.value }}</span>
        <button type="button" class="secondary" :disabled="session.page.value === session.pageCount.value" @click="changePage(1)">Далее →</button>
      </nav>
      <footer>1С:ERP Управление предприятием, редакция 2.5</footer>
    </div>
  </main>
  <noscript><p class="panel">Для просмотра вопросов включите JavaScript в браузере.</p></noscript>
</template>
