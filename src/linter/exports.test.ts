import { describe, expect, it } from 'vitest';
import { lint } from './engine';
import {
  REPORT_FORMATS,
  buildDocxReport,
  buildReportText,
  reportFilename,
} from './exports';

const result = lint(
  'US-1. Пользователь должен быстро войти в систему.\n' +
    'US-2. TODO: уточнить требования к уведомлениям.',
);

describe('report exports', () => {
  it('содержит все форматы экспорта', () => {
    expect(REPORT_FORMATS.map((format) => format.value)).toEqual([
      'md',
      'docx',
      'pdf',
      'txt',
      'html',
      'json',
      'csv',
    ]);
  });

  it('формирует Markdown и текстовый отчёт', () => {
    const markdown = buildReportText('md', result);
    const text = buildReportText('txt', result);

    expect(markdown).toContain('# Отчёт проверки требований');
    expect(markdown).toContain(`${result.score}/100`);
    expect(text).toContain('ОТЧЁТ ПРОВЕРКИ ТРЕБОВАНИЙ');
    expect(text).toContain(`Оценка: ${result.score}/100`);
    expect(text).toContain('Незавершённое требование');
  });

  it('экранирует HTML в отчёте', () => {
    const withHtml = lint('US-1. Система должна быть удобной <script>alert(1)</script>.');
    const html = buildReportText('html', withHtml);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('Проблемы');
  });

  it('формирует JSON с оценкой и замечаниями', () => {
    const parsed = JSON.parse(buildReportText('json', result)) as {
      score: number;
      signals: { requirementCount: number };
      issues: unknown[];
    };

    expect(parsed.score).toBe(result.score);
    expect(parsed.signals.requirementCount).toBe(2);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it('формирует CSV с BOM для Excel', () => {
    const csv = buildReportText('csv', result);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Важность";"Правило";"Категория"');
    expect(csv).toContain('"Незавершённое требование"');
  });

  it('формирует DOCX-архив', async () => {
    const blob = await buildDocxReport(result);
    const signature = new Uint8Array(await blob.arrayBuffer()).slice(0, 2);

    expect(blob.size).toBeGreaterThan(1000);
    expect([...signature]).toEqual([0x50, 0x4b]);
  });

  it('формирует корректные имена файлов', () => {
    expect(reportFilename('md')).toMatch(/^requirements-report-\d{4}-\d{2}-\d{2}\.md$/);
    expect(reportFilename('docx')).toMatch(/\.docx$/);
    expect(reportFilename('pdf')).toMatch(/\.pdf$/);
    expect(reportFilename('csv')).toMatch(/\.csv$/);
  });
});
