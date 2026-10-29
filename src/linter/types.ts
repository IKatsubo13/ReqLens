export type Severity = 'error' | 'warning' | 'info';

export type Category =
  | 'ambiguity'
  | 'modality'
  | 'style'
  | 'atomicity'
  | 'structure'
  | 'duplication';

export interface Requirement {
  index: number;
  text: string;
  start: number;
  end: number;
  line: number;
}

export interface Issue {
  id: string;
  ruleId: string;
  ruleTitle: string;
  category: Category;
  severity: Severity;
  message: string;
  hint: string;
  start: number;
  end: number;
  excerpt: string;
  match: string;
  line: number;
  requirementIndex: number;
}

export interface LintSignals {
  requirementCount: number;
  hasAcceptanceCriteria: boolean;
  hasGwt: boolean;
  hasUserStory: boolean;
  hasMetrics: boolean;
}

export interface LintResult {
  issues: Issue[];
  requirements: Requirement[];
  score: number;
  counts: Record<Severity, number>;
  signals: LintSignals;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  ambiguity: 'Неоднозначность',
  modality: 'Неопределённость',
  style: 'Стиль',
  atomicity: 'Атомарность',
  structure: 'Структура',
  duplication: 'Дублирование',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  error: 'Ошибка',
  warning: 'Предупреждение',
  info: 'Подсказка',
};
