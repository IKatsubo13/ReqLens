import { scoreLabel } from '../linter/engine';
import type { LintResult } from '../linter/types';
import { plural } from '../utils/plural';
import { CheckIcon } from './icons';

interface ScoreCardProps {
  result: LintResult;
  isEmpty: boolean;
}

type Tier = 'good' | 'ok' | 'weak' | 'bad';

const STAMP_WORD: Record<Tier, string> = {
  good: 'готово',
  ok: 'почти готово',
  weak: 'доработать',
  bad: 'критично',
};

function scoreTier(score: number): Tier {
  if (score >= 85) return 'good';
  if (score >= 65) return 'ok';
  if (score >= 40) return 'weak';
  return 'bad';
}

export function ScoreCard({ result, isEmpty }: ScoreCardProps) {
  const score = isEmpty ? 0 : result.score;
  const tier = scoreTier(score);
  const tierClass = isEmpty ? 'empty' : tier;
  const totalIssues = result.issues.length;

  const checks = [
    { label: 'Критерии приёмки', ok: result.signals.hasAcceptanceCriteria },
    { label: 'Дано / Когда / Тогда', ok: result.signals.hasGwt },
    { label: 'Роли и ценность', ok: result.signals.hasUserStory },
    { label: 'Метрики', ok: result.signals.hasMetrics },
  ];

  const requirementsLabel = `${result.signals.requirementCount} ${plural(
    result.signals.requirementCount,
    'требование',
    'требования',
    'требований',
  )}`;
  const issuesLabel =
    totalIssues === 0
      ? 'замечаний нет'
      : `${totalIssues} ${plural(totalIssues, 'замечание', 'замечания', 'замечаний')}`;

  return (
    <section className={`score-card tier-${tierClass}`} aria-label="Индекс качества требований">
      <div className="score-stamp-wrap">
        <div
          key={tierClass}
          className="score-stamp"
          role="img"
          aria-label={
            isEmpty
              ? 'Оценка отсутствует: документ пуст'
              : `Оценка ${score} из 100, ${STAMP_WORD[tier]}`
          }
        >
          <span className="stamp-number">
            {isEmpty ? '—' : score}
            {!isEmpty && <small>/100</small>}
          </span>
          <span className="stamp-word">{isEmpty ? 'нет данных' : STAMP_WORD[tier]}</span>
        </div>
      </div>

      <div className="score-info">
        <span className="score-eyebrow">Индекс качества</span>
        <h2>{isEmpty ? 'Документ пуст' : scoreLabel(score)}</h2>
        <p className="score-caption">
          {isEmpty
            ? 'Вставьте требования или выберите образец'
            : `${requirementsLabel} · ${issuesLabel}`}
        </p>

        {!isEmpty && (
          <div className="score-meter" aria-hidden="true">
            <span className="score-meter-fill" style={{ width: `${score}%` }} />
            <span className="score-meter-marker" style={{ left: `${score}%` }} />
          </div>
        )}

        {!isEmpty && (
          <ul className="proof-checks">
            {checks.map((check) => (
              <li key={check.label} className={check.ok ? 'is-ok' : undefined}>
                <span className="check-box">{check.ok && <CheckIcon size={9} />}</span>
                {check.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
