import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../data/examples';
import { lint, parseRequirements } from './engine';

const [bad, good, integration] = EXAMPLES;

describe('parseRequirements', () => {
  it('разбивает список на отдельные требования и пропускает заголовки', () => {
    const text = [
      '# Требования',
      '',
      '## Критерии приёмки',
      '',
      'US-1. Первое требование.',
      'US-2. Второе требование.',
      'Продолжение второго требования.',
      '',
      'Обычный абзац без списка.',
    ].join('\n');
    const requirements = parseRequirements(text);

    expect(requirements.map((item) => item.text)).toEqual([
      'Первое требование.',
      'Второе требование. Продолжение второго требования.',
      'Обычный абзац без списка.',
    ]);
    expect(requirements[0].line).toBe(5);
  });

  it('понимает маркированные и нумерованные списки', () => {
    const requirements = parseRequirements('- Первый пункт\n2. Второй пункт');
    expect(requirements).toHaveLength(2);
    expect(requirements[1].text).toBe('Второй пункт');
  });
});

describe('lint', () => {
  it('находит неоднозначности, пассив и отсутствие критериев в плохом ТЗ', () => {
    const result = lint(bad.text);
    const ruleIds = new Set(result.issues.map((issue) => issue.ruleId));

    expect(ruleIds.has('vague-speed')).toBe(true);
    expect(ruleIds.has('vague-quality')).toBe(true);
    expect(ruleIds.has('uncertain-modality')).toBe(true);
    expect(ruleIds.has('passive-voice')).toBe(true);
    expect(ruleIds.has('missing-ac')).toBe(true);
    expect(ruleIds.has('duplicate-requirement')).toBe(true);
    expect(result.score).toBeLessThan(40);
    expect(result.counts.error).toBeGreaterThan(0);
  });

  it('не находит проблем в хорошем ТЗ', () => {
    const result = lint(good.text);

    expect(result.issues).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.signals.hasAcceptanceCriteria).toBe(true);
    expect(result.signals.hasGwt).toBe(true);
    expect(result.signals.hasUserStory).toBe(true);
    expect(result.signals.hasMetrics).toBe(true);
  });

  it('ловит пассив только в возвратной форме, не в активном залоге', () => {
    const passive = lint('Уведомление обрабатывается в течение 5 секунд.');
    const active = lint('Система обеспечивает отправку уведомлений.');

    expect(passive.issues.some((issue) => issue.ruleId === 'passive-voice')).toBe(true);
    expect(active.issues.some((issue) => issue.ruleId === 'passive-voice')).toBe(false);
  });

  it('считает TODO ошибкой', () => {
    const result = lint('US-1. TODO: описать сценарий восстановления пароля.');
    const issue = result.issues.find((item) => item.ruleId === 'incomplete-requirement');

    expect(issue?.severity).toBe('error');
    expect(issue?.match.toLowerCase()).toBe('todo');
  });

  it('даёт среднюю оценку интеграционному ТЗ', () => {
    const result = lint(integration.text);

    expect(result.score).toBeGreaterThan(40);
    expect(result.score).toBeLessThan(90);
    expect(result.signals.hasGwt).toBe(true);
  });

  it('возвращает пустой результат для пустого документа', () => {
    const result = lint('   \n\n  ');

    expect(result.requirements).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.signals.requirementCount).toBe(0);
  });
});
