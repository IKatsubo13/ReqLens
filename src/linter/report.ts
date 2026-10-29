import { scoreLabel } from './engine';
import type { LintResult, Severity } from './types';
import { CATEGORY_LABELS, SEVERITY_LABELS } from './types';
import { plural } from '../utils/plural';

export function buildMarkdownReport(result: LintResult): string {
  const { issues, score, counts, signals } = result;
  const date = new Date().toLocaleDateString('ru-RU');
  const severityOrder: Severity[] = ['error', 'warning', 'info'];

  const lines: string[] = [
    '# Отчёт проверки требований',
    '',
    `Дата: ${date}`,
    '',
    `**Оценка: ${score}/100** — ${scoreLabel(score)}`,
    '',
    `- Требований в документе: ${signals.requirementCount}`,
    `- Ошибки: ${counts.error}`,
    `- Предупреждения: ${counts.warning}`,
    `- Подсказки: ${counts.info}`,
    '',
  ];

  if (issues.length === 0) {
    lines.push('Проблем не найдено. Документ выглядит однозначным и проверяемым.', '');
  } else {
    lines.push('## Проблемы', '');
    for (const severity of severityOrder) {
      const group = issues.filter((issue) => issue.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${SEVERITY_LABELS[severity]} (${group.length})`, '');
      for (const issue of group) {
        const location = issue.excerpt
          ? `Строка ${issue.line}: «${issue.excerpt}»`
          : 'Документ целиком';
        lines.push(
          `- **${issue.ruleTitle}** · ${CATEGORY_LABELS[issue.category]}`,
          `  - Где: ${location}`,
          `  - Проблема: ${issue.message}`,
          `  - Как исправить: ${issue.hint}`,
        );
      }
      lines.push('');
    }
  }

  const strengths: string[] = [];
  if (signals.hasAcceptanceCriteria) strengths.push('есть критерии приёмки');
  if (signals.hasGwt) strengths.push('критерии в формате Дано / Когда / Тогда');
  if (signals.hasUserStory) strengths.push('указаны роль и ценность требований');
  if (signals.hasMetrics) strengths.push('используются измеримые значения');
  if (strengths.length > 0) {
    lines.push('## Что уже хорошо', '');
    strengths.forEach((strength) => lines.push(`- ${strength}`));
    lines.push('');
  }

  const total = issues.length;
  lines.push(
    `Найдено ${total} ${plural(total, 'замечание', 'замечания', 'замечаний')}. Проверка выполнена локально в браузере, текст никуда не отправлялся.`,
    '',
    '---',
    'Сгенерировано ReqLens — линтер требований.',
  );

  return lines.join('\n');
}
