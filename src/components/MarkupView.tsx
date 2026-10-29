import { useMemo } from 'react';
import type { Issue, LintResult, Severity } from '../linter/types';
import { LensIcon } from './icons';

interface MarkupViewProps {
  text: string;
  result: LintResult;
  isEmpty: boolean;
}

interface Segment {
  text: string;
  severity?: Severity;
  title?: string;
}

const PRIORITY: Record<Severity, number> = { error: 3, warning: 2, info: 1 };
const MAX_HIGHLIGHT_LENGTH = 80;

function buildSegments(text: string, issues: Issue[]): Segment[] {
  const candidates = issues
    .filter(
      (issue) =>
        issue.excerpt.length > 0 &&
        issue.end > issue.start &&
        issue.end - issue.start <= MAX_HIGHLIGHT_LENGTH,
    )
    .sort((left, right) => {
      if (left.start !== right.start) return left.start - right.start;
      return PRIORITY[right.severity] - PRIORITY[left.severity];
    });

  const segments: Segment[] = [];
  let cursor = 0;
  for (const issue of candidates) {
    if (issue.start < cursor) continue;
    if (issue.start > cursor) {
      segments.push({ text: text.slice(cursor, issue.start) });
    }
    segments.push({
      text: text.slice(issue.start, issue.end),
      severity: issue.severity,
      title: `${issue.ruleTitle}: ${issue.message}`,
    });
    cursor = issue.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

export function MarkupView({ text, result, isEmpty }: MarkupViewProps) {
  const segments = useMemo(
    () => (isEmpty ? [] : buildSegments(text, result.issues)),
    [text, result.issues, isEmpty],
  );

  if (isEmpty) {
    return (
      <div className="empty-state">
        <LensIcon size={30} />
        <h3>Подсветка пуста</h3>
        <p>Введите документ, чтобы увидеть проблемные места прямо в тексте.</p>
      </div>
    );
  }

  return (
    <div className="markup-view">
      <div className="markup-legend">
        <span className="legend-item legend-error">ошибка</span>
        <span className="legend-item legend-warning">предупреждение</span>
        <span className="legend-item legend-info">подсказка</span>
      </div>
      <pre className="markup-text">
        {segments.map((segment, index) =>
          segment.severity ? (
            <mark
              key={index}
              className={`mark mark-${segment.severity}`}
              title={segment.title}
            >
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </pre>
    </div>
  );
}
