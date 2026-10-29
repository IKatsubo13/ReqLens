import { useMemo, useState } from 'react';
import type { Issue, LintResult, Severity } from '../linter/types';
import { CATEGORY_LABELS } from '../linter/types';
import { CheckIcon, LensIcon } from './icons';

interface IssueListProps {
  result: LintResult;
  isEmpty: boolean;
}

type Filter = 'all' | Severity;

const SEVERITY_TITLE: Record<Severity, string> = {
  error: 'Ошибка',
  warning: 'Предупреждение',
  info: 'Подсказка',
};

function IssueCard({
  issue,
  extraMatches,
  index,
}: {
  issue: Issue;
  extraMatches: string[];
  index: number;
}) {
  return (
    <article
      className={`issue issue-${issue.severity}`}
      style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
    >
      <span className="issue-no">{String(index + 1).padStart(2, '0')}</span>
      <div className="issue-main">
        <div className="issue-head">
          <span className="issue-kicker">
            <span className="issue-swatch" />
            {SEVERITY_TITLE[issue.severity]} · {CATEGORY_LABELS[issue.category]}
          </span>
          <span className="issue-line">
            {issue.excerpt ? `стр. ${issue.line}` : 'весь документ'}
          </span>
          <h3>{issue.ruleTitle}</h3>
        </div>
        <p className="issue-message">
          {issue.message}
          {extraMatches.length > 0 && (
            <span className="issue-extra">
              {' '}
              Также в этом требовании: {extraMatches.map((match) => `«${match}»`).join(', ')}.
            </span>
          )}
        </p>
        {issue.excerpt && <blockquote>{issue.excerpt}</blockquote>}
        <p className="issue-hint">
          <span className="hint-label">Как исправить</span>
          <span>{issue.hint}</span>
        </p>
      </div>
    </article>
  );
}

interface GroupedIssue {
  key: string;
  issue: Issue;
  extraMatches: string[];
}

function groupIssues(issues: Issue[]): GroupedIssue[] {
  const groups = new Map<string, GroupedIssue>();
  for (const issue of issues) {
    const key = `${issue.ruleId}@${issue.requirementIndex}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { key, issue, extraMatches: [] });
      continue;
    }
    const extra = issue.match.trim();
    if (
      extra &&
      extra !== existing.issue.match &&
      !existing.extraMatches.includes(extra) &&
      existing.extraMatches.length < 3
    ) {
      existing.extraMatches.push(extra);
    }
  }
  return [...groups.values()];
}

export function IssueList({ result, isEmpty }: IssueListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const { counts } = result;

  const visible = useMemo(
    () =>
      filter === 'all'
        ? result.issues
        : result.issues.filter((issue) => issue.severity === filter),
    [filter, result.issues],
  );

  if (isEmpty) {
    return (
      <div className="empty-state">
        <LensIcon size={30} />
        <h3>Здесь появится разбор</h3>
        <p>Вставьте ТЗ, user stories или критерии приёмки — проверка идёт прямо во время набора.</p>
      </div>
    );
  }

  if (result.issues.length === 0) {
    return (
      <div className="empty-state empty-success">
        <CheckIcon size={26} />
        <h3>Замечаний нет</h3>
        <p>Формулировки однозначные, критерии приёмки на месте. Можно отдавать в разработку.</p>
      </div>
    );
  }

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Все', count: result.issues.length },
    { key: 'error', label: 'Ошибки', count: counts.error },
    { key: 'warning', label: 'Предупреждения', count: counts.warning },
    { key: 'info', label: 'Подсказки', count: counts.info },
  ];

  return (
    <div className="issue-list">
      <div className="filter-row" role="group" aria-label="Фильтр по важности">
        <span className="filter-label">Фильтр</span>
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`filter-chip ${filter === item.key ? 'is-active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state empty-compact">
          <CheckIcon size={22} />
          <h3>В этой категории пусто</h3>
          <p>Переключите фильтр, чтобы увидеть остальные замечания.</p>
        </div>
      ) : (
        groupIssues(visible).map((group, index) => (
          <IssueCard
            key={group.key}
            issue={group.issue}
            extraMatches={group.extraMatches}
            index={index}
          />
        ))
      )}
    </div>
  );
}
