import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

/** ---------- helpers ---------- */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(arr) {
  return [...new Set((arr || []).map((x) => String(x).toUpperCase()))].sort();
}

function same(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return na.length === nb.length && na.every((v, i) => v === nb[i]);
}

function getChapterNumber(q) {
  // Expect ids like "1.16", "2.9", "3.1" etc.
  const id = String(q?.id ?? "").trim();
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  // fallback: if you ever add chapterNumber field
  if (typeof q?.chapterNumber === "number") return q.chapterNumber;
  return null;
}

function buildOptionList(optionsObj, shuffleOptions) {
  const entries = Object.entries(optionsObj).map(([key, text]) => ({ key, text }));
  return shuffleOptions ? shuffleArray(entries) : entries;
}

/** ---------- app ---------- */
export default function App() {
  // Start screen state (chapter selection)
  const [selectedChapters, setSelectedChapters] = useState([]); // array of numbers
  const [quizStarted, setQuizStarted] = useState(false);

  // Features you wanted to keep
  const [practiceMode, setPracticeMode] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // Quiz runtime state
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Available chapters derived from the data
  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter((x) => Number.isFinite(x));
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  // Filter questions by chosen chapters
  const filteredQuestions = useMemo(() => {
    if (!selectedChapters.length) return [];
    const s = new Set(selectedChapters);
    return QUESTIONS.filter((q) => s.has(getChapterNumber(q)));
  }, [selectedChapters]);

  // Build the quiz when started (keeps shuffle functionality)
  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    const base = filteredQuestions.slice(0);
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filteredQuestions, shuffleQuestions]);

  // Option order per question (shuffle options)
  const optionOrders = useMemo(() => {
    const map = {};
    for (const q of quiz) {
      map[q.id] = buildOptionList(q.options, shuffleOptions);
    }
    return map;
  }, [quiz, shuffleOptions]);

  const current = quiz[index];

  const progress = useMemo(() => {
    const total = quiz.length || 0;
    const answered = quiz.reduce((acc, q) => acc + ((answers[q.id] || []).length > 0 ? 1 : 0), 0);
    const step = total ? index + 1 : 0;
    const pct = total ? (step / total) * 100 : 0;
    return { total, answered, step, pct };
  }, [quiz, answers, index]);

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      if (same(answers[q.id], q.correct)) ok += 1;
    }
    return { ok, total: quiz.length, pct: quiz.length ? (ok / quiz.length) * 100 : 0 };
  }, [submitted, answers, quiz]);

  function toggleAnswer(qid, opt) {
    if (submitted) return;
    setAnswers((prev) => {
      const curr = new Set(prev[qid] || []);
      if (curr.has(opt)) curr.delete(opt);
      else curr.add(opt);
      return { ...prev, [qid]: Array.from(curr) };
    });
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    setIndex((i) => Math.min(quiz.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartToChapters() {
    setQuizStarted(false);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
    // keep selectedChapters as-is (user can change or just hit Start again)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hardRestart() {
    // also clears selected chapters
    setQuizStarted(false);
    setSelectedChapters([]);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** ---------- Start screen (chapter selection) ---------- */
  if (!quizStarted) {
    const allSelected = chapters.length > 0 && selectedChapters.length === chapters.length;

    return (
      <div className="safe-area">
        <div className="container">
          <header className="topbar" style={{ position: "relative" }}>
            <div className="topbar-left">
              <div className="appname">FDV Quiz PoC</div>
              <div className="subtle">Choose chapters, then start.</div>
            </div>
          </header>

          <section className="card">
            <h3 className="title">Chapter selection</h3>
            <div className="tiny muted" style={{ marginBottom: 10 }}>
              Chapters are detected from question IDs like <b>1.16</b>, <b>2.9</b>, etc.
            </div>

            <div className="settings-row" style={{ marginBottom: 10 }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.checked)}
                />
                <span>Practice mode (show solution immediately)</span>
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                <span>Shuffle questions</span>
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                />
                <span>Shuffle options</span>
              </label>
            </div>

            <div className="nav" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <button
                className="btn"
                onClick={() => setSelectedChapters(chapters)}
                disabled={allSelected || chapters.length === 0}
              >
                Select all
              </button>

              <button
                className="btn"
                onClick={() => setSelectedChapters([])}
                disabled={selectedChapters.length === 0}
              >
                Clear
              </button>

              <button
                className="btn btn-primary"
                onClick={() => setQuizStarted(true)}
                disabled={selectedChapters.length === 0}
                title={selectedChapters.length === 0 ? "Select at least one chapter" : "Start quiz"}
              >
                Start quiz
              </button>
            </div>

            <div className="review-list" style={{ marginTop: 12 }}>
              {chapters.map((ch) => {
                const count = QUESTIONS.filter((q) => getChapterNumber(q) === ch).length;
                const checked = selectedChapters.includes(ch);
                return (
                  <label key={ch} className="review-item" style={{ cursor: "pointer" }}>
                    <div className="review-left">
                      <div className="review-q">Chapter {ch}</div>
                      <div className="tiny muted">{count} question(s)</div>
                    </div>
                    <div className="review-right">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedChapters((prev) => {
                            if (e.target.checked) return [...new Set([...prev, ch])].sort((a, b) => a - b);
                            return prev.filter((x) => x !== ch);
                          });
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <footer className="footer tiny muted">
            Public PoC • Runs fully in-browser • No tracking
          </footer>
        </div>
      </div>
    );
  }

  /** ---------- Quiz screen ---------- */
  if (!current) {
    return (
      <div className="safe-area">
        <div className="container">
          <section className="card">
            <h3 className="title">No questions for selected chapter(s)</h3>
            <p className="muted">Go back and choose different chapters.</p>
            <button className="btn btn-primary" onClick={hardRestart}>
              Back to chapters
            </button>
          </section>
        </div>
      </div>
    );
  }

  const selected = new Set(answers[current.id] || []);
  const correctNow = current.correct || [];

  const isLast = index === quiz.length - 1;
  const isFirst = index === 0;

  const showPracticeFeedback = practiceMode && (answers[current.id] || []).length > 0 && !submitted;
  const currentIsCorrect = same(answers[current.id], correctNow);

  return (
    <div className="safe-area">
      <div className="container">
        {/* Header */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="appname">FDV Quiz PoC</div>
            <div className="subtle">
              Question <b>{progress.step}</b> / {progress.total} • Answered <b>{progress.answered}</b>
            </div>
          </div>

          <div className="topbar-right" style={{ gap: 8, flexDirection: "row" }}>
            <button className="btn" onClick={restartToChapters}>
              Chapters
            </button>

            {!submitted ? (
              <button
                className="btn btn-primary"
                onClick={() => setSubmitted(true)}
                disabled={progress.answered === 0}
              >
                Submit
              </button>
            ) : (
              <div className="pill">
                Score: <b>{score.ok}</b>/{score.total} ({score.pct.toFixed(1)}%)
              </div>
            )}
          </div>
        </header>

        {/* Progress bar */}
        <div className="progress-wrap" aria-label="Progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>

        {/* Settings card (kept) */}
        <section className="card settings">
          <div className="settings-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={practiceMode}
                onChange={(e) => setPracticeMode(e.target.checked)}
                disabled={submitted}
              />
              <span>Practice mode</span>
            </label>

            <label className="toggle">
              <input type="checkbox" checked={shuffleQuestions} disabled />
              <span>Shuffle questions (locked after start)</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                disabled={submitted}
              />
              <span>Shuffle options</span>
            </label>
          </div>
          <div className="tiny muted">
            Tip: To re-randomize question order, go back to <b>Chapters</b> and Start again.
          </div>
        </section>

        {/* Question card */}
        <section className="card quiz">
          <div className="question-meta">
            {(current.chapter || current.source) ? (
              <span className="muted">{[current.chapter, current.source].filter(Boolean).join(" • ")}</span>
            ) : (
              <span className="muted"> </span>
            )}
          </div>

          <h2 className="question-title">
            {index + 1}) {current.question}
          </h2>

          <div className="options">
            {optionOrders[current.id].map(({ key, text }) => {
              const isSel = selected.has(key);
              const isCorr = correctNow.includes(key);

              let badge = "";
              let stateClass = "";

              if (submitted) {
                if (isCorr && isSel) {
                  badge = "✅ correct";
                  stateClass = "opt-correct";
                } else if (isCorr && !isSel) {
                  badge = "🟩 correct";
                  stateClass = "opt-correct";
                } else if (!isCorr && isSel) {
                  badge = "❌ selected";
                  stateClass = "opt-wrong";
                }
              } else if (practiceMode && isSel) {
                if (isCorr) {
                  badge = "✅";
                  stateClass = "opt-correct";
                } else {
                  badge = "❌";
                  stateClass = "opt-wrong";
                }
              }

              return (
                <button
                  key={key}
                  className={`option ${isSel ? "selected" : ""} ${stateClass}`}
                  onClick={() => toggleAnswer(current.id, key)}
                  disabled={submitted}
                >
                  <div className="option-row">
                    <div className="option-text">
                      <span className="optkey">{key}.</span> {text}
                    </div>
                    <div className="option-badge">{badge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {showPracticeFeedback && (
            <div className={`callout ${currentIsCorrect ? "ok" : "bad"}`}>
              {currentIsCorrect
                ? "✅ Correct"
                : `❌ Not quite — correct: ${normalize(correctNow).join(", ")}`}
            </div>
          )}

          {/* Navigation */}
          <div className="nav">
            <button className="btn" onClick={goPrev} disabled={isFirst}>
              ← Back
            </button>

            <div className="nav-center muted">{selected.size > 0 ? "Answered" : "Not answered yet"}</div>

            {!isLast ? (
              <button className="btn btn-primary" onClick={goNext}>
                Next →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setSubmitted(true)}>
                Finish & Submit
              </button>
            )}
          </div>
        </section>

        {/* Review */}
        {submitted && (
          <section className="card review">
            <h3 className="title">Review</h3>
            <div className="tiny muted">Tap an item to jump to that question.</div>

            <div className="review-list">
              {quiz.map((q, i) => {
                const sel = normalize(answers[q.id] || []);
                const corr = normalize(q.correct || []);
                const ok = same(sel, corr);

                return (
                  <button
                    key={q.id}
                    className={`review-item ${ok ? "ok" : "bad"}`}
                    onClick={() => {
                      setIndex(i);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <div className="review-left">
                      <div className="review-q">
                        {i + 1}) {q.question}
                      </div>
                      <div className="tiny muted">
                        Your: <b>{sel.length ? sel.join(", ") : "—"}</b> • Correct: <b>{corr.join(", ")}</b>
                      </div>
                    </div>
                    <div className="review-right">{ok ? "✅" : "❌"}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={restartToChapters}>
                Back to chapters
              </button>
              <button className="btn btn-primary" onClick={hardRestart}>
                Change chapters
              </button>
            </div>
          </section>
        )}

        <footer className="footer tiny muted">
          Public PoC • Runs fully in-browser • No tracking
        </footer>
      </div>
    </div>
  );
}
