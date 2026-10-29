import type {
  Category,
  Issue,
  Requirement,
  Severity,
} from './types';

interface TermGroup {
  ruleId: string;
  ruleTitle: string;
  category: Category;
  severity: Severity;
  patterns: string[];
  message: (match: string) => string;
  hint: string;
}

const SPEED_GROUP: TermGroup = {
  ruleId: 'vague-speed',
  ruleTitle: 'Скорость без метрики',
  category: 'ambiguity',
  severity: 'warning',
  patterns: [
    'быстр[а-яё]{0,6}',
    'оперативн[а-яё]{0,6}',
    'своевременн[а-яё]{0,6}',
    'в кратчайшие сроки',
    'как можно быстрее',
    'максимальн[а-яё]{0,6}',
    'минимальн[а-яё]{0,6}',
    'fast|quickly|quick',
  ],
  message: (m) => `«${m}» нельзя проверить: скорость не задана измеримо.`,
  hint: 'Задайте метрику: например, «p95 ответа < 300 мс при 100 RPS».',
};

const QUALITY_GROUP: TermGroup = {
  ruleId: 'vague-quality',
  ruleTitle: 'Оценочная формулировка',
  category: 'ambiguity',
  severity: 'warning',
  patterns: [
    'удобн[а-яё]{0,6}',
    'интуитивн[а-яё]{0,6}',
    'современн[а-яё]{0,6}',
    'качественн[а-яё]{0,6}',
    'над[её]жн[а-яё]{0,6}',
    'стабильн[а-яё]{0,6}',
    'гибк[а-яё]{0,4}',
    'эффективн[а-яё]{0,5}',
    'оптимальн[а-яё]{0,6}',
    'адекватн[а-яё]{0,5}',
    'нормальн[а-яё]{0,6}',
    'корректн[а-яё]{0,5}',
    'прост[а-яё]{0,3}',
    'л[её]гк[а-яё]{0,3}',
    'без ошибок',
    'user-friendly|seamless|robust|reliable|efficient',
  ],
  message: (m) => `«${m}» — субъективная оценка, которую нельзя принять в работу.`,
  hint: 'Опишите наблюдаемое поведение: какие шаги, за какое время, с каким результатом.',
};

const QUANTITY_GROUP: TermGroup = {
  ruleId: 'vague-quantity',
  ruleTitle: 'Неточное количество',
  category: 'ambiguity',
  severity: 'warning',
  patterns: [
    'несколько',
    'множеств[а-яё]{0,5}',
    'некотор[а-яё]{0,5}',
    'большинств[а-яё]{0,6}',
    'достаточн[а-яё]{0,6}',
    'значительн[а-яё]{0,7}',
    'незначительн[а-яё]{0,7}',
    'существенн[а-яё]{0,7}',
    'примерно',
    'часто',
    'редко',
    'иногда',
    'обычно',
  ],
  message: (m) => `«${m}» не задаёт проверяемого количества.`,
  hint: 'Укажите число, диапазон или процент: например, «не менее 3», «до 5%».',
};

const LIST_GROUP: TermGroup = {
  ruleId: 'vague-list',
  ruleTitle: 'Открытый перечень',
  category: 'ambiguity',
  severity: 'warning',
  patterns: [
    'и т\\.\\s*д\\.',
    'и т\\.\\s*п\\.',
    'и др\\.',
    'и проч[а-яё]{0,2}',
    'и так далее',
    'etc\\.',
  ],
  message: (m) => `«${m}» оставляет перечень открытым и допускает любые трактовки.`,
  hint: 'Закройте список: перечислите все пункты явно.',
};

const MODALITY_GROUP: TermGroup = {
  ruleId: 'uncertain-modality',
  ruleTitle: 'Неуверенное требование',
  category: 'modality',
  severity: 'warning',
  patterns: [
    'при необходимости',
    'по возможности',
    'при наличии',
    'если потребуется',
    'желательно',
    'опционально',
    'как правило',
    'в основном',
    'возможно',
    'вероятно',
  ],
  message: (m) => `«${m}» делает поведение системы необязательным или неопределённым.`,
  hint: 'Решите: требование обязательное или его нет. Зафиксируйте одно поведение.',
};

const INCOMPLETE_GROUP: TermGroup = {
  ruleId: 'incomplete-requirement',
  ruleTitle: 'Незавершённое требование',
  category: 'modality',
  severity: 'error',
  patterns: [
    'tbd',
    'todo',
    'xxx',
    'уточнить',
    'уточняется',
    'не определено',
  ],
  message: (m) => `«${m}» — требование ещё не сформулировано.`,
  hint: 'Заполните требование до передачи в разработку, иначе его реализуют по догадке.',
};

const PASSIVE_GROUP: TermGroup = {
  ruleId: 'passive-voice',
  ruleTitle: 'Пассивный залог',
  category: 'style',
  severity: 'info',
  patterns: [
    'осуществля[а-яё]{0,5}ся',
    'обеспечива[а-яё]{0,5}ся',
    'производ[а-яё]{0,5}ся',
    'выполня[а-яё]{0,5}ся',
    'реализу[а-яё]{0,5}ся',
    'явля[а-яё]{0,3}тся',
    'предоставля[а-яё]{0,5}ся',
    'формиру[а-яё]{0,5}ся',
    'обрабатыва[а-яё]{0,5}ся',
    'необходимо обеспечить',
  ],
  message: (m) => `«${m}» скрывает, кто выполняет действие.`,
  hint: 'Напишите активным залогом: «Система отправляет письмо в течение 10 секунд».',
};

const TERM_GROUPS: TermGroup[] = [
  SPEED_GROUP,
  QUALITY_GROUP,
  QUANTITY_GROUP,
  LIST_GROUP,
  MODALITY_GROUP,
  INCOMPLETE_GROUP,
  PASSIVE_GROUP,
];

const SEVERITY_WEIGHT: Record<Severity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

const CYRILLIC_BOUNDARY_START = '(^|[^а-яёa-z])';
const BOUNDARY_END = '(?![а-яёa-z])';

function findGroupMatches(text: string, pattern: string) {
  const regex = new RegExp(
    `${CYRILLIC_BOUNDARY_START}(${pattern})${BOUNDARY_END}`,
    'gi',
  );
  const matches: Array<{ start: number; end: number; value: string }> = [];
  for (const match of text.matchAll(regex)) {
    const start = (match.index ?? 0) + match[1].length;
    const value = match[2];
    matches.push({ start, end: start + value.length, value });
  }
  return matches;
}

function clip(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function makeIssue(params: {
  ruleId: string;
  ruleTitle: string;
  category: Category;
  severity: Severity;
  message: string;
  hint: string;
  start: number;
  end: number;
  match: string;
  requirement: Requirement;
}): Issue {
  return {
    id: `${params.ruleId}:${params.start}:${params.end}`,
    ruleId: params.ruleId,
    ruleTitle: params.ruleTitle,
    category: params.category,
    severity: params.severity,
    message: params.message,
    hint: params.hint,
    start: params.start,
    end: params.end,
    excerpt: clip(params.requirement.text),
    match: params.match,
    line: params.requirement.line,
    requirementIndex: params.requirement.index,
  };
}

export function findTermIssues(requirements: Requirement[]): Issue[] {
  const issues: Issue[] = [];
  for (const requirement of requirements) {
    const seen = new Map<string, Issue>();
    for (const group of TERM_GROUPS) {
      for (const pattern of group.patterns) {
        for (const match of findGroupMatches(requirement.text, pattern)) {
          const key = `${requirement.start + match.start}:${requirement.start + match.end}`;
          const candidate = makeIssue({
            ruleId: group.ruleId,
            ruleTitle: group.ruleTitle,
            category: group.category,
            severity: group.severity,
            message: group.message(match.value),
            hint: group.hint,
            start: requirement.start + match.start,
            end: requirement.start + match.end,
            match: match.value,
            requirement,
          });
          const existing = seen.get(key);
          if (!existing || SEVERITY_WEIGHT[candidate.severity] > SEVERITY_WEIGHT[existing.severity]) {
            seen.set(key, candidate);
          }
        }
      }
    }
    issues.push(...seen.values());
  }
  return issues;
}

export function findAtomicityIssues(requirements: Requirement[]): Issue[] {
  const issues: Issue[] = [];
  for (const requirement of requirements) {
    const text = requirement.text;

    const orMatches = findGroupMatches(text, 'и\\s*/\\s*или');
    for (const match of orMatches) {
      issues.push(
        makeIssue({
          ruleId: 'ambiguous-or',
          ruleTitle: '«И/или»',
          category: 'atomicity',
          severity: 'warning',
          message: '«И/или» допускает два разных поведения системы.',
          hint: 'Выберите одно: «и» или «или», либо разделите на два требования.',
          start: requirement.start + match.start,
          end: requirement.start + match.end,
          match: match.value,
          requirement,
        }),
      );
    }

    const modalMatches = findGroupMatches(
      text,
      'должен|должна|должно|должны|необходимо|следует',
    );
    const modalCount = modalMatches.length;
    const connectorMatches = findGroupMatches(text, 'и');
    const connectorCount = connectorMatches.length;

    if (modalCount >= 2) {
      const target = modalMatches[1];
      issues.push(
        makeIssue({
          ruleId: 'compound-modal',
          ruleTitle: 'Несколько требований в одном',
          category: 'atomicity',
          severity: 'warning',
          message: `В требовании ${modalCount} модальных глагола — возможно, это несколько требований.`,
          hint: 'Оставьте одно требование на пункт: так его можно отдельно проверить и протестировать.',
          start: requirement.start + target.start,
          end: requirement.start + target.end,
          match: target.value,
          requirement,
        }),
      );
    } else if (connectorCount >= 3 && text.split(/\s+/).length > 12) {
      const target = connectorMatches[1];
      issues.push(
        makeIssue({
          ruleId: 'compound-and',
          ruleTitle: 'Длинное составное требование',
          category: 'atomicity',
          severity: 'info',
          message: 'Требование объединяет несколько действий через «и».',
          hint: 'Проверьте, можно ли разделить его на атомарные пункты — по одному действию.',
          start: requirement.start + target.start,
          end: requirement.start + target.end,
          match: target.value,
          requirement,
        }),
      );
    } else {
      const commaIndex = text.indexOf(',');
      const commaCount = (text.match(/,/g) ?? []).length;
      if (commaCount >= 3 && text.split(/\s+/).length >= 10) {
        issues.push(
          makeIssue({
            ruleId: 'enumeration',
            ruleTitle: 'Перечисление в одном пункте',
            category: 'atomicity',
            severity: 'info',
            message: 'Похоже, в требовании перечислено несколько действий.',
            hint: 'Разделите перечисление на отдельные требования — так проще оценить и протестировать каждое.',
            start: requirement.start + commaIndex,
            end: requirement.start + commaIndex + 1,
            match: ',',
            requirement,
          }),
        );
      }
    }
  }
  return issues;
}
