import { findAtomicityIssues, findTermIssues } from './rules';
import type {
  Issue,
  LintResult,
  LintSignals,
  Requirement,
  Severity,
} from './types';

const HEADING_RE = /^\s*#{1,6}\s+\S/;
const BOLD_HEADING_RE = /^\s*\*\*[^*]+\*\*\s*:?$/;
const SECTION_LABEL_RE =
  /^(?:критерии при[её]мки|acceptance criteria|определение готовности|definition of done|контекст|ограничения|глоссарий|scope|out of scope|требования)\s*:?$/i;
const LIST_PREFIX_RE =
  /^\s*(?:[-*•–—]|\d+[.)]|(?:US|AC|FR|NFR|REQ|Т)[- ]?\d*[.):]|требование\s*\d*[.:])\s+/i;

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

interface Line {
  text: string;
  start: number;
}

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text[i] === '\n') {
      lines.push({ text: text.slice(start, i), start });
      start = i + 1;
    }
  }
  return lines;
}

function isServiceLine(text: string): boolean {
  return HEADING_RE.test(text) || BOLD_HEADING_RE.test(text) || SECTION_LABEL_RE.test(text.trim());
}

export function parseRequirements(text: string): Requirement[] {
  const lines = splitLines(text);
  const requirements: Requirement[] = [];
  let current: { start: number; end: number; parts: string[]; line: number } | null = null;

  const flush = () => {
    if (!current) return;
    const joined = current.parts.join(' ').trim();
    if (joined.length > 0) {
      requirements.push({
        index: requirements.length,
        text: joined,
        start: current.start,
        end: current.end,
        line: current.line,
      });
    }
    current = null;
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.text.trim();
    if (!trimmed) {
      flush();
      return;
    }
    if (isServiceLine(trimmed)) {
      flush();
      return;
    }
    const prefix = line.text.match(LIST_PREFIX_RE);
    if (prefix) {
      flush();
      const leading = line.text.length - line.text.trimStart().length;
      current = {
        start: line.start + prefix[0].length,
        end: line.start + line.text.length,
        parts: [trimmed.slice(prefix[0].length - leading)],
        line: lineIndex + 1,
      };
      return;
    }
    if (!current) {
      const leading = line.text.length - line.text.trimStart().length;
      current = {
        start: line.start + leading,
        end: line.start + line.text.length,
        parts: [],
        line: lineIndex + 1,
      };
    }
    current.parts.push(trimmed);
    current.end = line.start + line.text.length;
  });
  flush();

  return requirements;
}

function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    'должен', 'должна', 'должно', 'должны', 'система', 'пользователь',
    'возможность', 'быть', 'чтобы', 'также', 'который', 'которая', 'которые',
    'этого', 'этот', 'при', 'для', 'или', 'если', 'когда', 'тогда', 'дано',
    'может', 'могут', 'всех', 'все', 'или', 'его', 'она', 'оно', 'они',
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word)),
  );
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function findDuplicateIssues(requirements: Requirement[]): Issue[] {
  const issues: Issue[] = [];
  const tokens = requirements.map((requirement) => tokenize(requirement.text));
  for (let i = 0; i < requirements.length; i += 1) {
    for (let j = i + 1; j < requirements.length; j += 1) {
      if (tokens[i].size < 4 || tokens[j].size < 4) continue;
      const similarity = jaccard(tokens[i], tokens[j]);
      if (similarity < 0.75) continue;
      const requirement = requirements[j];
      issues.push({
        id: `duplicate:${requirements[i].index}:${requirement.index}`,
        ruleId: 'duplicate-requirement',
        ruleTitle: 'Возможный дубль',
        category: 'duplication',
        severity: 'warning',
        message: `Требование на строке ${requirement.line} совпадает с требованием на строке ${requirements[i].line} на ${Math.round(similarity * 100)}%.`,
        hint: 'Оставьте одну формулировку или явно разделите их по смыслу.',
        start: requirement.start,
        end: requirement.start + Math.min(requirement.text.length, 1),
        excerpt: requirement.text.slice(0, 220),
        match: requirement.text.slice(0, 40),
        line: requirement.line,
        requirementIndex: requirement.index,
      });
    }
  }
  return issues;
}

function findStructureIssues(
  requirements: Requirement[],
  signals: LintSignals,
): Issue[] {
  const issues: Issue[] = [];
  if (requirements.length === 0) return issues;
  const anchor = requirements[0];

  if (!signals.hasAcceptanceCriteria && !signals.hasGwt) {
    issues.push({
      id: 'missing-ac:doc',
      ruleId: 'missing-ac',
      ruleTitle: 'Нет критериев приёмки',
      category: 'structure',
      severity: 'warning',
      message: 'В документе не найдены критерии приёмки — разработчику и QA не с чем сверяться.',
      hint: 'Добавьте раздел «Критерии приёмки» в формате: Дано / Когда / Тогда.',
      start: anchor.start,
      end: anchor.start + Math.min(anchor.text.length, 1),
      excerpt: '',
      match: '',
      line: 1,
      requirementIndex: anchor.index,
    });
  } else if (!signals.hasGwt) {
    issues.push({
      id: 'no-gwt:doc',
      ruleId: 'no-gwt',
      ruleTitle: 'Критерии без Given/When/Then',
      category: 'structure',
      severity: 'info',
      message: 'Критерии приёмки есть, но не в формате Дано / Когда / Тогда.',
      hint: 'Формат «Дано — Когда — Тогда» делает проверку однозначной и переносимой в тест-кейсы.',
      start: anchor.start,
      end: anchor.start + Math.min(anchor.text.length, 1),
      excerpt: '',
      match: '',
      line: 1,
      requirementIndex: anchor.index,
    });
  }

  if (!signals.hasUserStory && requirements.length >= 2) {
    issues.push({
      id: 'no-role:doc',
      ruleId: 'no-role',
      ruleTitle: 'Не указаны роль и ценность',
      category: 'structure',
      severity: 'info',
      message: 'Не найден формат «Как <роль>, я хочу <действие>, чтобы <ценность>».',
      hint: 'Роль и цель помогают выбрать правильное решение, когда детали не описаны.',
      start: anchor.start,
      end: anchor.start + Math.min(anchor.text.length, 1),
      excerpt: '',
      match: '',
      line: 1,
      requirementIndex: anchor.index,
    });
  }

  return issues;
}

function containsWord(text: string, words: string): boolean {
  return new RegExp(`(^|[^а-яёa-z])(?:${words})(?![а-яёa-z])`, 'i').test(text);
}

function collectSignals(text: string, requirements: Requirement[]): LintSignals {
  const hasAcceptanceCriteria =
    /критери[а-яё]{0,3}\s+при[её]мк|acceptance\s+criteria|definition\s+of\s+done|определение\s+готовности/i.test(
      text,
    );
  const hasGwt =
    containsWord(text, 'дано|given') &&
    containsWord(text, 'когда|when') &&
    containsWord(text, 'тогда|then');
  const hasUserStory =
    /как\s+[^,\n]{2,60},\s*я\s+хочу|as\s+an?\s+[^,\n]{2,60},\s*i\s+want/i.test(text);
  const hasMetrics =
    /\d+(?:[.,]\d+)?\s*(?:%|мс|ms|секунд[а-яё]{0,3}|сек|мин[а-яё]{0,3}|час[а-яё]{0,3}|руб|₽|rps|запрос[а-яё]{0,3}|мб|mb|гб|gb|тб|tb)/i.test(
      text,
    );

  return {
    requirementCount: requirements.length,
    hasAcceptanceCriteria,
    hasGwt,
    hasUserStory,
    hasMetrics,
  };
}

function scoreIssues(issues: Issue[], requirementCount: number): number {
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === 'error') return sum + 10;
    if (issue.severity === 'warning') return sum + 5;
    return sum + 1.5;
  }, 0);
  const density = penalty / Math.max(1, requirementCount);
  return Math.max(0, Math.min(100, Math.round(100 - density * 6)));
}

export function lint(text: string): LintResult {
  const normalized = text.replace(/\r\n/g, '\n');
  const requirements = parseRequirements(normalized);
  const signals = collectSignals(normalized, requirements);

  const issues = [
    ...findTermIssues(requirements),
    ...findAtomicityIssues(requirements),
    ...findDuplicateIssues(requirements),
    ...findStructureIssues(requirements, signals),
  ].sort((left, right) => {
    const bySeverity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (bySeverity !== 0) return bySeverity;
    if (left.line !== right.line) return left.line - right.line;
    return left.start - right.start;
  });

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity] += 1;

  return {
    issues,
    requirements,
    score: scoreIssues(issues, requirements.length),
    counts,
    signals,
  };
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Готово к разработке';
  if (score >= 65) return 'Почти готово';
  if (score >= 40) return 'Требует доработки';
  return 'Критично для разработки';
}
