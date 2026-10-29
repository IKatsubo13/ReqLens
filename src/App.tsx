import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { IssueList } from './components/IssueList';
import { MarkupView } from './components/MarkupView';
import { ReportView } from './components/ReportView';
import { ScoreCard } from './components/ScoreCard';
import { LensIcon, LockIcon, TrashIcon, UploadIcon } from './components/icons';
import { EXAMPLES } from './data/examples';
import { lint } from './linter/engine';
import { extractDocumentText } from './utils/upload';
import { plural } from './utils/plural';

type Tab = 'issues' | 'markup' | 'report';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'issues', label: 'Проблемы' },
  { key: 'markup', label: 'Разметка' },
  { key: 'report', label: 'Отчёт' },
];

function App() {
  const [text, setText] = useState(EXAMPLES[0].text);
  const [tab, setTab] = useState<Tab>('issues');
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deferredText = useDeferredValue(text);
  const result = useMemo(() => lint(deferredText), [deferredText]);
  const isEmpty = text.trim().length === 0;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordsLabel = `${wordCount} ${plural(wordCount, 'слово', 'слова', 'слов')}`;
  const charsLabel = `${text.length} ${plural(text.length, 'символ', 'символа', 'символов')}`;

  const handleFile = async (file?: File) => {
    if (!file || isParsing) return;

    setUploadError(null);
    setIsParsing(true);

    try {
      const content = await extractDocumentText(file);
      setText(content);
      setTab('issues');
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Не удалось прочитать файл.',
      );
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <div className="brand-mark">
            <LensIcon size={24} />
          </div>
          <div className="brand-text">
            <p className="brand-kicker">Инструмент аналитика · выпуск 0.1</p>
            <h1>
              ReqLens<span className="brand-dot">.</span>
              <span className="brand-beta">beta</span>
            </h1>
            <p className="brand-tagline">
              Корректура требований — до того, как их прочитает разработчик
            </p>
          </div>
        </div>
        <div className="masthead-meta">
          <span className="local-badge">
            <LockIcon size={11} />
            Локальная проверка
          </span>
          <span className="masthead-note">15 правил · без LLM · open source</span>
        </div>
      </header>

      <main className="workspace">
        <section className="panel editor-panel">
          <div className="panel-head">
            <div className="panel-title">
              <span className="panel-index">01</span>
              <div>
                <h2>Документ</h2>
                <span className="panel-sub">
                  {wordsLabel} · {charsLabel}
                </span>
              </div>
            </div>
            <div className="example-chips">
              {EXAMPLES.map((example, index) => (
                <button
                  key={example.id}
                  type="button"
                  title={example.hint}
                  disabled={isParsing}
                  className={`example-chip ${text === example.text ? 'is-active' : ''}`}
                  onClick={() => {
                    setText(example.text);
                    setTab('issues');
                    setUploadError(null);
                  }}
                >
                  <span className="chip-index">{String(index + 1).padStart(2, '0')}</span>
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="editor-body"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleFile(event.dataTransfer.files[0]);
            }}
          >
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setUploadError(null);
              }}
              readOnly={isParsing}
              placeholder="Вставьте ТЗ или загрузите документ…"
              spellCheck={false}
              aria-label="Текст требований"
            />
          </div>

          {uploadError && (
            <div className="editor-alert" role="alert">
              <span>{uploadError}</span>
              <button
                type="button"
                className="editor-alert-close"
                aria-label="Закрыть сообщение"
                onClick={() => setUploadError(null)}
              >
                ×
              </button>
            </div>
          )}

          <div className="editor-footer">
            <button
              type="button"
              className="ghost-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              <UploadIcon />
              {isParsing ? 'Читаю файл…' : 'Загрузить файл'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf,.xls,.xlsx,text/plain,text/markdown,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setText('');
                setUploadError(null);
              }}
              disabled={isEmpty || isParsing}
            >
              <TrashIcon />
              Очистить
            </button>
            <span className="footer-note">Word, PDF, Excel, .md или .txt</span>
          </div>
        </section>

        <section className="panel results-panel">
          <ScoreCard result={result} isEmpty={isEmpty} />

          <div className="tabs" role="tablist" aria-label="Результаты проверки">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={`tab ${tab === item.key ? 'is-active' : ''}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
                {item.key === 'issues' && result.issues.length > 0 && (
                  <span className="tab-count">{result.issues.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="tab-body">
            {tab === 'issues' && <IssueList result={result} isEmpty={isEmpty} />}
            {tab === 'markup' && (
              <MarkupView text={deferredText} result={result} isEmpty={isEmpty} />
            )}
            {tab === 'report' && <ReportView result={result} isEmpty={isEmpty} />}
          </div>
        </section>
      </main>

      <footer className="page-footer">
        <span>
          ReqLens · корректура требований ·{' '}
          <a className="footer-link" href="./">
            Промо
          </a>
        </span>
        <span>Данные не покидают браузер · 0 сетевых запросов</span>
      </footer>
    </div>
  );
}

export default App;
