import { scoreLabel } from './engine';
import { buildMarkdownReport } from './report';
import type { LintResult, Severity } from './types';
import { CATEGORY_LABELS, SEVERITY_LABELS } from './types';

export type ReportFormat = 'md' | 'docx' | 'pdf' | 'txt' | 'html' | 'json' | 'csv';
export type TextReportFormat = Exclude<ReportFormat, 'docx' | 'pdf'>;

export interface ReportFormatOption {
  value: ReportFormat;
  label: string;
  extension: string;
  mime: string;
}

export const REPORT_FORMATS: ReportFormatOption[] = [
  {
    value: 'md',
    label: 'Markdown (.md)',
    extension: 'md',
    mime: 'text/markdown;charset=utf-8',
  },
  {
    value: 'docx',
    label: 'Word (.docx)',
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    value: 'pdf',
    label: 'PDF (.pdf)',
    extension: 'pdf',
    mime: 'application/pdf',
  },
  {
    value: 'txt',
    label: 'Текст (.txt)',
    extension: 'txt',
    mime: 'text/plain;charset=utf-8',
  },
  {
    value: 'html',
    label: 'HTML (.html)',
    extension: 'html',
    mime: 'text/html;charset=utf-8',
  },
  {
    value: 'json',
    label: 'JSON (.json)',
    extension: 'json',
    mime: 'application/json;charset=utf-8',
  },
  {
    value: 'csv',
    label: 'CSV для Excel (.csv)',
    extension: 'csv',
    mime: 'text/csv;charset=utf-8',
  },
];

function formatDate(): string {
  return new Date().toLocaleDateString('ru-RU');
}

function getStrengths(result: LintResult): string[] {
  const strengths: string[] = [];
  if (result.signals.hasAcceptanceCriteria) strengths.push('есть критерии приёмки');
  if (result.signals.hasGwt) strengths.push('критерии в формате Дано / Когда / Тогда');
  if (result.signals.hasUserStory) strengths.push('указаны роль и ценность требований');
  if (result.signals.hasMetrics) strengths.push('используются измеримые значения');
  return strengths;
}

function issueLocation(excerpt: string, line: number): string {
  return excerpt ? `стр. ${line}` : 'весь документ';
}

function countsSummary(result: LintResult): string {
  return `Требований: ${result.signals.requirementCount} · Ошибки: ${result.counts.error} · Предупреждения: ${result.counts.warning} · Подсказки: ${result.counts.info}`;
}

function escapeHtml(value: string): string {
  const escapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => escapes[char] ?? char);
}

function severityClass(severity: Severity): string {
  return `severity-${severity}`;
}

function buildPlainText(result: LintResult): string {
  const lines: string[] = [
    'ОТЧЁТ ПРОВЕРКИ ТРЕБОВАНИЙ',
    '',
    `Дата: ${formatDate()}`,
    `Оценка: ${result.score}/100 — ${scoreLabel(result.score)}`,
    countsSummary(result),
    '',
    'ПРОБЛЕМЫ',
    '',
  ];

  if (result.issues.length === 0) {
    lines.push('Проблем не найдено.');
  } else {
    result.issues.forEach((issue, index) => {
      lines.push(
        `${index + 1}. ${SEVERITY_LABELS[issue.severity]} · ${CATEGORY_LABELS[issue.category]}`,
        `   Правило: ${issue.ruleTitle}`,
        `   Где: ${issueLocation(issue.excerpt, issue.line)}`,
        `   Проблема: ${issue.message}`,
      );
      if (issue.excerpt) lines.push(`   Фрагмент: ${issue.excerpt}`);
      lines.push(`   Как исправить: ${issue.hint}`, '');
    });
  }

  const strengths = getStrengths(result);
  if (strengths.length > 0) {
    lines.push('ЧТО УЖЕ ХОРОШО', '');
    strengths.forEach((strength) => lines.push(`- ${strength}`));
    lines.push('');
  }

  lines.push('Проверка выполнена локально в браузере; текст не отправлялся на сервер.');
  return lines.join('\n');
}

function buildHtml(result: LintResult): string {
  const strengths = getStrengths(result);
  const issueHtml =
    result.issues.length === 0
      ? '<p class="empty">Проблем не найдено.</p>'
      : result.issues
          .map(
            (issue) => `
          <article class="issue ${severityClass(issue.severity)}">
            <div class="issue-kicker">${escapeHtml(SEVERITY_LABELS[issue.severity])} · ${escapeHtml(CATEGORY_LABELS[issue.category])}</div>
            <h3>${escapeHtml(issue.ruleTitle)}</h3>
            <p class="location">${escapeHtml(issueLocation(issue.excerpt, issue.line))}</p>
            <p>${escapeHtml(issue.message)}</p>
            ${issue.excerpt ? `<blockquote>${escapeHtml(issue.excerpt)}</blockquote>` : ''}
            <p class="hint"><strong>Как исправить:</strong> ${escapeHtml(issue.hint)}</p>
          </article>`,
          )
          .join('');

  const strengthsHtml =
    strengths.length > 0
      ? `<section class="strengths"><h2>Что уже хорошо</h2><ul>${strengths
          .map((strength) => `<li>${escapeHtml(strength)}</li>`)
          .join('')}</ul></section>`
      : '';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ReqLens — отчёт проверки требований</title>
  <style>
    :root { color-scheme: light; --ink:#17182e; --paper:#f5efe3; --paper-2:#fdfaf2; --blue:#2c40a7; --pink:#f237a1; --pink-deep:#b81a76; --line:#d9d0be; }
    * { box-sizing: border-box; }
    body { margin:0; padding:32px; background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; line-height:1.55; }
    .report { max-width:860px; margin:0 auto; padding:40px; border:2px solid var(--blue); border-radius:8px; background:var(--paper-2); box-shadow:8px 8px 0 var(--pink); }
    .kicker { margin:0 0 8px; color:var(--pink-deep); font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; }
    h1, h2, h3 { color:var(--blue); line-height:1.2; }
    h1 { margin:0 0 10px; font-size:34px; letter-spacing:-.03em; }
    h2 { margin:30px 0 14px; padding-top:18px; border-top:1px solid var(--line); font-size:22px; }
    h3 { margin:0 0 6px; font-size:17px; }
    .meta { margin:0 0 18px; color:#5d6475; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12px; }
    .score { display:inline-flex; align-items:baseline; gap:6px; margin-bottom:10px; padding:12px 16px; border:2px solid var(--pink); border-radius:4px; color:var(--pink-deep); font-size:30px; font-weight:700; transform:rotate(-2deg); }
    .score small { font-size:12px; font-weight:400; color:var(--ink); opacity:.7; }
    .summary { margin:0 0 24px; color:#4b5262; }
    .checks { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 10px; padding:0; list-style:none; }
    .checks li { padding:4px 8px; border:1px solid var(--line); border-radius:999px; font-size:12px; }
    .checks .ok { border-color:#9ab0d8; color:var(--blue); }
    .issue { margin:0 0 18px; padding:16px 18px; border:1px solid var(--line); border-left:4px solid var(--line); border-radius:4px; background:#fff; }
    .issue.severity-error { border-left-color:#a11d4a; }
    .issue.severity-warning { border-left-color:var(--pink); }
    .issue.severity-info { border-left-color:var(--blue); }
    .issue-kicker { margin-bottom:4px; color:var(--pink-deep); font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
    .location { margin:0 0 8px; color:#6b7280; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:11px; }
    blockquote { margin:10px 0; padding:8px 12px; border-left:2px solid var(--line); background:rgba(236,228,213,.55); color:#4b5262; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12px; }
    .hint { margin:8px 0 0; font-size:13px; }
    .strengths { margin-top:24px; }
    .strengths h2 { margin-bottom:10px; }
    .strengths ul { margin:0; padding-left:20px; }
    .empty { padding:20px; border:1px dashed var(--line); color:#5d6475; }
    footer { margin-top:30px; padding-top:14px; border-top:1px solid var(--line); color:#6b7280; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:10px; }
    @media (max-width:640px) { body { padding:12px; } .report { padding:22px 16px; box-shadow:4px 4px 0 var(--pink); } h1 { font-size:27px; } }
    @media print { body { padding:0; background:#fff; } .report { max-width:none; border:0; box-shadow:none; padding:0; } }
  </style>
</head>
<body>
  <main class="report">
    <p class="kicker">ReqLens · проверка требований</p>
    <h1>Отчёт проверки требований</h1>
    <p class="meta">Дата: ${escapeHtml(formatDate())}</p>
    <div class="score">${result.score}<small>/100</small></div>
    <p class="summary">${escapeHtml(scoreLabel(result.score))} · ${escapeHtml(
      countsSummary(result),
    )}</p>
    <ul class="checks">
      <li class="${result.signals.hasAcceptanceCriteria ? 'ok' : ''}">Критерии приёмки</li>
      <li class="${result.signals.hasGwt ? 'ok' : ''}">Дано / Когда / Тогда</li>
      <li class="${result.signals.hasUserStory ? 'ok' : ''}">Роли и ценность</li>
      <li class="${result.signals.hasMetrics ? 'ok' : ''}">Метрики</li>
    </ul>
    <h2>Проблемы</h2>
    ${issueHtml}
    ${strengthsHtml}
    <footer>Проверка выполнена локально в браузере; текст не отправлялся на сервер.</footer>
  </main>
</body>
</html>`;
}

function buildJson(result: LintResult): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      generatedDate: formatDate(),
      score: result.score,
      scoreLabel: scoreLabel(result.score),
      counts: result.counts,
      signals: result.signals,
      requirements: result.requirements,
      issues: result.issues,
    },
    null,
    2,
  );
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(result: LintResult): string {
  const header = [
    'Важность',
    'Правило',
    'Категория',
    'Строка',
    'Фрагмент',
    'Проблема',
    'Рекомендация',
  ];
  const rows = result.issues.map((issue) => [
    SEVERITY_LABELS[issue.severity],
    issue.ruleTitle,
    CATEGORY_LABELS[issue.category],
    issue.excerpt ? String(issue.line) : 'весь документ',
    issue.excerpt,
    issue.message,
    issue.hint,
  ]);

  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function buildReportText(format: TextReportFormat, result: LintResult): string {
  if (format === 'md') return buildMarkdownReport(result);
  if (format === 'txt') return buildPlainText(result);
  if (format === 'html') return buildHtml(result);
  if (format === 'json') return buildJson(result);
  return buildCsv(result);
}

export async function buildDocxReport(result: LintResult): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: 'Отчёт проверки требований', heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Оценка: ${result.score}/100 — ${scoreLabel(result.score)}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph(`Дата: ${formatDate()}`),
    new Paragraph(countsSummary(result)),
    new Paragraph(''),
    new Paragraph({ text: 'Проблемы', heading: HeadingLevel.HEADING_1 }),
  ];

  if (result.issues.length === 0) {
    children.push(new Paragraph('Проблем не найдено.'));
  } else {
    result.issues.forEach((issue, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${issue.ruleTitle}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${SEVERITY_LABELS[issue.severity]} · ${CATEGORY_LABELS[issue.category]}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph(`Где: ${issueLocation(issue.excerpt, issue.line)}`),
        new Paragraph(`Проблема: ${issue.message}`),
      );
      if (issue.excerpt) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Фрагмент: ${issue.excerpt}`, italics: true })],
          }),
        );
      }
      children.push(
        new Paragraph(`Как исправить: ${issue.hint}`),
        new Paragraph(''),
      );
    });
  }

  const strengths = getStrengths(result);
  if (strengths.length > 0) {
    children.push(new Paragraph({ text: 'Что уже хорошо', heading: HeadingLevel.HEADING_1 }));
    strengths.forEach((strength) => {
      children.push(new Paragraph({ text: strength, bullet: { level: 0 } }));
    });
  }

  children.push(
    new Paragraph(''),
    new Paragraph('Проверка выполнена локально в браузере; текст не отправлялся на сервер.'),
  );

  const document = new Document({
    creator: 'ReqLens',
    title: 'Отчёт проверки требований',
    description: 'Сгенерировано ReqLens',
    sections: [{ children }],
  });

  return Packer.toBlob(document);
}

interface PdfMakeBrowser {
  addFontContainer(container: unknown): void;
  createPdf(definition: unknown): {
    getBuffer(): Promise<Uint8Array>;
  };
}

let pdfMakePromise: Promise<PdfMakeBrowser> | null = null;

async function getPdfMake(): Promise<PdfMakeBrowser> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const [pdfMakeModule, robotoModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/fonts/Roboto.js'),
      ]);
      const pdfMake =
        (pdfMakeModule as { default?: PdfMakeBrowser }).default ??
        (pdfMakeModule as unknown as PdfMakeBrowser);
      const roboto =
        (robotoModule as { default?: unknown }).default ?? robotoModule;
      pdfMake.addFontContainer(roboto);
      return pdfMake;
    })();
  }

  return pdfMakePromise;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#2c40a7';
  if (score >= 65) return '#4054b8';
  if (score >= 40) return '#b81a76';
  return '#a11d4a';
}

function buildPdfDefinition(result: LintResult): Record<string, unknown> {
  const content: unknown[] = [
    { text: 'REQLENS · ПРОВЕРКА ТРЕБОВАНИЙ', style: 'kicker' },
    { text: 'Отчёт проверки требований', style: 'title' },
    { text: `Дата: ${formatDate()}`, style: 'meta' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: `Оценка: ${result.score}/100 — ${scoreLabel(result.score)}`,
              fillColor: scoreColor(result.score),
              color: '#fdfaf2',
              bold: true,
              fontSize: 13,
              margin: [10, 7, 10, 7],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 6, 0, 10],
    },
    { text: countsSummary(result), style: 'meta' },
    {
      text: [
        { text: 'Критерии приёмки: ', bold: true },
        { text: result.signals.hasAcceptanceCriteria ? 'есть' : 'нет' },
        { text: ' · Дано / Когда / Тогда: ', bold: true },
        { text: result.signals.hasGwt ? 'есть' : 'нет' },
        { text: ' · Роли и ценность: ', bold: true },
        { text: result.signals.hasUserStory ? 'есть' : 'нет' },
        { text: ' · Метрики: ', bold: true },
        { text: result.signals.hasMetrics ? 'есть' : 'нет' },
      ],
      style: 'meta',
    },
    { text: 'Проблемы', style: 'h2' },
  ];

  if (result.issues.length === 0) {
    content.push({ text: 'Проблем не найдено.', style: 'body' });
  } else {
    result.issues.forEach((issue, index) => {
      content.push({
        stack: [
          {
            text: `${index + 1} · ${SEVERITY_LABELS[issue.severity]} · ${CATEGORY_LABELS[issue.category]}`,
            style: 'kicker',
          },
          { text: issue.ruleTitle, style: 'issueTitle' },
          {
            text: `Где: ${issueLocation(issue.excerpt, issue.line)}`,
            style: 'meta',
          },
          { text: issue.message, style: 'body', margin: [0, 2, 0, 3] },
          ...(issue.excerpt
            ? [{ text: `«${issue.excerpt}»`, style: 'quote' }]
            : []),
          {
            text: [
              { text: 'Как исправить: ', bold: true, color: '#2c40a7' },
              { text: issue.hint },
            ],
            style: 'hint',
          },
        ],
        margin: [0, 0, 0, 12],
      });
    });
  }

  const strengths = getStrengths(result);
  if (strengths.length > 0) {
    content.push(
      { text: 'Что уже хорошо', style: 'h2' },
      { ul: strengths, style: 'body' },
    );
  }

  content.push({
    text: 'Проверка выполнена локально в браузере; текст не отправлялся на сервер.',
    style: 'meta',
    margin: [0, 12, 0, 0],
  });

  return {
    pageSize: 'A4',
    pageMargins: [42, 44, 42, 50],
    info: {
      title: 'Отчёт проверки требований',
      author: 'ReqLens',
      creator: 'ReqLens',
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: '#17182e',
      lineHeight: 1.35,
    },
    styles: {
      kicker: {
        fontSize: 8,
        bold: true,
        color: '#b81a76',
        characterSpacing: 0.6,
        margin: [0, 0, 0, 2],
      },
      title: {
        fontSize: 20,
        bold: true,
        color: '#2c40a7',
        margin: [0, 2, 0, 4],
      },
      meta: { fontSize: 9, color: '#6a6578', margin: [0, 0, 0, 3] },
      h2: {
        fontSize: 13,
        bold: true,
        color: '#2c40a7',
        margin: [0, 16, 0, 8],
      },
      issueTitle: {
        fontSize: 12,
        bold: true,
        color: '#2c40a7',
        margin: [0, 1, 0, 3],
      },
      body: { fontSize: 10, color: '#3f415c' },
      quote: {
        fontSize: 9,
        italics: true,
        color: '#6a6578',
        margin: [0, 4, 0, 4],
      },
      hint: { fontSize: 9, color: '#3f415c', margin: [0, 3, 0, 0] },
    },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: 'ReqLens · отчёт проверки требований',
          alignment: 'left',
        },
        { text: `${currentPage} / ${pageCount}`, alignment: 'right' },
      ],
      margin: [42, 16, 42, 0],
      fontSize: 8,
      color: '#6a6578',
    }),
  };
}

export async function buildPdfReport(result: LintResult): Promise<Blob> {
  const pdfMake = await getPdfMake();
  const buffer = await pdfMake
    .createPdf(buildPdfDefinition(result))
    .getBuffer();
  const bytes = Uint8Array.from(buffer);
  return new Blob([bytes.buffer], { type: 'application/pdf' });
}

export function reportFilename(format: ReportFormat): string {
  const option = REPORT_FORMATS.find((item) => item.value === format) ?? REPORT_FORMATS[0];
  return `requirements-report-${new Date().toISOString().slice(0, 10)}.${option.extension}`;
}
