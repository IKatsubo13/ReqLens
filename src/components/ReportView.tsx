import { useMemo, useState } from 'react';
import {
  REPORT_FORMATS,
  buildDocxReport,
  buildPdfReport,
  buildReportText,
  reportFilename,
} from '../linter/exports';
import type { ReportFormat } from '../linter/exports';
import type { LintResult } from '../linter/types';
import { CheckIcon, CopyIcon, DownloadIcon, LensIcon } from './icons';

interface ReportViewProps {
  result: LintResult;
  isEmpty: boolean;
}

function fallbackCopy(text: string) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportView({ result, isEmpty }: ReportViewProps) {
  const markdown = useMemo(() => buildReportText('md', result), [result]);
  const [format, setFormat] = useState<ReportFormat>('md');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      fallbackCopy(markdown);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (isExporting) return;

    setExportError(null);

    try {
      if (format === 'docx' || format === 'pdf') {
        setIsExporting(true);
        const blob =
          format === 'docx' ? await buildDocxReport(result) : await buildPdfReport(result);
        downloadBlob(blob, reportFilename(format));
        return;
      }

      const option = REPORT_FORMATS.find((item) => item.value === format);
      if (!option) throw new Error('Unknown report format');
      const blob = new Blob([buildReportText(format, result)], {
        type: option.mime,
      });
      downloadBlob(blob, reportFilename(format));
    } catch {
      setExportError('Не удалось подготовить отчёт. Попробуй ещё раз или выбери другой формат.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="empty-state">
        <LensIcon size={30} />
        <h3>Отчёт ещё не готов</h3>
        <p>
          Добавьте требования — и получите отчёт в Markdown, Word, PDF, TXT, HTML, JSON
          или CSV.
        </p>
      </div>
    );
  }

  return (
    <div className="report-view">
      <div className="report-toolbar">
        <span className="report-caption">Предпросмотр Markdown</span>
        <div className="report-actions">
          <label className="report-format">
            <span>Формат</span>
            <select
              value={format}
              aria-label="Формат отчёта"
              onChange={(event) => {
                setFormat(event.target.value as ReportFormat);
                setExportError(null);
              }}
            >
              {REPORT_FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost-button"
            onClick={handleDownload}
            disabled={isExporting}
          >
            <DownloadIcon />
            {isExporting ? 'Готовлю…' : 'Скачать'}
          </button>
          <button type="button" className="ghost-button" onClick={handleCopy}>
            {copied ? <CheckIcon size={14} /> : <CopyIcon />}
            {copied ? 'Скопировано' : 'Копировать Markdown'}
          </button>
        </div>
      </div>

      {exportError && (
        <p className="report-error" role="alert">
          {exportError}
        </p>
      )}

      <pre className="report-pre">{markdown}</pre>
      <p className="report-hint">
        PDF — для отправки и печати, Word — для согласования, CSV — для Excel.
      </p>
    </div>
  );
}
