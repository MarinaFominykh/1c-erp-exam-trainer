<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Section } from '../study/types';

defineProps<{ sections: Section[]; selected: ReadonlySet<number> }>();
const emit = defineEmits<{
  change: [number: number, selected: boolean];
  selectAll: [];
  clear: [];
}>();

const panel = ref<HTMLDetailsElement | null>(null);
onMounted(() => { if (panel.value) panel.value.open = window.matchMedia('(min-width: 901px)').matches; });
</script>

<template>
  <details ref="panel" class="panel sections-panel">
    <summary>Разделы <span class="muted">{{ selected.size }} / {{ sections.length }}</span></summary>
    <div class="section-actions">
      <button type="button" class="text-button" @click="emit('selectAll')">Выбрать все</button>
      <button type="button" class="text-button" @click="emit('clear')">Снять выбор</button>
    </div>
    <fieldset id="section-options">
      <legend class="sr-only">Выберите один или несколько разделов</legend>
      <label v-for="section in sections" :key="section.number" class="section-option">
        <input type="checkbox" :checked="selected.has(section.number)"
          @change="emit('change', section.number, ($event.target as HTMLInputElement).checked)" />
        <span class="section-name"><span class="section-number">{{ section.number }}.</span> {{ section.name }}</span>
        <span class="section-total" :aria-label="`${section.count} вопросов`">{{ section.count }}</span>
      </label>
    </fieldset>
    <p class="section-hint">Можно выбрать несколько разделов.</p>
  </details>
</template>
