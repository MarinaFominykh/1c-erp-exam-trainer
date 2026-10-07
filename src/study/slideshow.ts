import type { Question } from './types';

export interface Slide {
  section: string;
  sectionNumber: number;
  columns: Question[][];
  height: number;
}

export function paginateSlides(questions: readonly Question[], heights: readonly number[], availableHeight: number, columnCount: number, gap = 12): Slide[] {
  const slides: Slide[] = [];
  let slide: Slide | undefined;
  let column = 0;
  let used = 0;

  for (const [index, question] of questions.entries()) {
    const height = heights[index] ?? availableHeight;
    if (!slide || slide.sectionNumber !== question.section_number) {
      slide = { section: question.section, sectionNumber: question.section_number, columns: Array.from({ length: columnCount }, () => []), height: 0 };
      slides.push(slide);
      column = 0;
      used = 0;
    }
    if (used > 0 && used + gap + height > availableHeight) {
      column++;
      used = 0;
    }
    if (column >= columnCount) {
      slide = { section: question.section, sectionNumber: question.section_number, columns: Array.from({ length: columnCount }, () => []), height: 0 };
      slides.push(slide);
      column = 0;
    }
    slide.columns[column]!.push(question);
    used += (used ? gap : 0) + height;
    slide.height = Math.max(slide.height, used);
  }
  return slides;
}
