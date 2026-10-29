import { useMemo, useState } from 'react';
import { buildMarkdownReport } from '../linter/report';
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

export function ReportView({ result, isEmpty }: ReportViewProps) {
  const markdown = useMemo(() => buildMarkdownReport(result), [result]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      fallbackCopy(markdown);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requirements-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isEmpty) {
    return (
      <div className="empty-state">
        <LensIcon size={30} />
        <h3>Отчёт ещё не готов</h3>
        <p>Добавьте требования — и получите Markdown-отчёт, который можно приложить к тикету.</p>
      </div>
    );
  }

  return (
    <div className="report-view">
      <div className="report-toolbar">
        <span className="report-caption">Markdown для тикета или Confluence</span>
        <div className="report-actions">
          <button type="button" className="ghost-button" onClick={handleCopy}>
            {copied ? <CheckIcon size={14} /> : <CopyIcon />}
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button type="button" className="ghost-button" onClick={handleDownload}>
            <DownloadIcon />
            Скачать .md
          </button>
        </div>
      </div>
      <pre className="report-pre">{markdown}</pre>
    </div>
  );
}
