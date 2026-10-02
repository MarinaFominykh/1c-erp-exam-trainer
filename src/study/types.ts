export interface Question {
  id: string;
  section_number: number;
  section: string;
  question_number: number;
  question: string;
  options: string;
  answer_number: number | null;
  answer_text: string | null;
  confirmed: boolean;
}

export interface Option { number: number; text: string }
export interface Section { number: number; name: string; count: number }
export type Confirmation = 'all' | 'confirmed' | 'unconfirmed';
export type StudyMode = 'answers' | 'practice';

export interface QuestionFilters {
  sections: ReadonlySet<number>;
  confirmation?: Confirmation;
  query?: string;
}
