import { useEffect, useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

/** ---- helpers ---- */
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

function buildOptionList(optionsObj, shuffleOptions) {
  const entries = Object.entries(optionsObj).map(([key, text]) => ({ key, text }));
  return shuffleOptions ? shuffleArray(entries) : entries;
}

/** ---- app ---- */
export default function App() {
  // Settings (requested)
  const [practiceMode, setPracticeMode] = useState(false); // (6)
  const [shuffleQuestions, setShuffleQuestions] = useState(true); // (3)
  const [shuffleOptions, setShuffleOptions] = useState(true); // (4)

  // Build quiz (randomize questions)
  const quiz = useMemo(() => {
    const base = QUESTIONS.slice(0); // all (or your 5/20)
    return shuffleQuestions ? shuffleArray(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // lock initial order on first load

  // Per-question option order (shuffle options)
  const optionOrders = useMemo(() => {
    const map = {};
    for (const q of quiz) {
      map[q.id] = buildOptionList(q.options, shuffleOptions);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, shuffleOptions]);

  const [index, setIndex] = useState(0); // (1)
  const [answers, setAnswers] = useState({}); // qid -> ["A","C"]
  const [submitted, setSubmitted] = useState(false);

  const current = quiz[index];

  const progress = useMemo(() => {
    const total = quiz.length;
    const answered = quiz.reduce((acc, q) => acc + ((answers[q.id] || []).length > 0 ? 1 : 0), 0);
    return { total, answered, step: index + 1, pct: ((index + 1) / total) * 100 };
  }, [quiz, answers, index]); // (2)

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      if (same(answers[q.id], q.correct)) ok += 1;
    }
    return { ok, total: quiz.length, pct: (ok / quiz.length) * 100 };
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

  function restart() {
    // simple restart: refresh the page to re-randomize with current toggles
    window.location.reload();
  }

  const selected = new Set(answers[current?.id] || []);
  const correctNow = current ? current.correct : [];

  // If you toggle shuffle settings after start, we keep quiz order stable; restart to apply.
  useEffect(() => {
    // noop, but keeps lint happy if you later add persistence
  }, []);

  if (!current) {
    return (
      <div className="safe-area">
        <div className="container">
          <div className="card">
            <h2 className="title">No questions found</h2>
            <p className="muted">Your QUESTIONS array seems empty.</p>
          </div>
        </div>
      </div>
    );
  }

  const isLast = index === quiz.length - 1;
  const isFirst = index === 0;

  // Practice mode feedback on current question only
  const showPracticeFeedback = practiceMode && (answers[current.id] || []).length > 0;
  const currentIsCorrect = same(answers[current.id], current.correct);

  return (
    <div className="safe-area">
      <div className="container">
        {/* Header / Controls */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="appname">FDV Quiz PoC</div>
            <div className="subtle">
              Question <b>{progress.step}</b> / {progress.total} • Answered <b>{progress.answered}</b>
            </div>
          </div>

          <div className="topbar-right">
            <button className="btn" onClick={restart}>
              Restart
            </button>

            {!submitted ? (
              <button
                className="btn btn-primary"
                onClick={() => setSubmitted(true)}
                disabled={progress.answered === 0}
                title={progress.answered === 0 ? "Answer at least one question" : "Submit quiz"}
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

        {/* Settings (requested 6, 3, 4, 7) */}
        <section className="card settings">
          <div className="settings-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={practiceMode}
                onChange={(e) => setPracticeMode(e.target.checked)}
                disabled={submitted}
              />
              <span>Practice mode (show solution immediately)</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                disabled
              />
              <span>Shuffle questions (applies on restart)</span>
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
            Tip: to apply question shuffle toggle, use <b>Restart</b>.
          </div>
        </section>

        {/* Question Card (1 per screen) */}
        <section className="card quiz">
          <div className="question-meta">
            {current.chapter || current.source ? (
              <span className="muted">
                {[current.chapter, current.source].filter(Boolean).join(" • ")}
              </span>
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
                // practice mode: show immediate feedback only for chosen options
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

          {/* Practice feedback */}
          {showPracticeFeedback && (
            <div className={`callout ${currentIsCorrect ? "ok" : "bad"}`}>
              {currentIsCorrect
                ? "✅ Correct"
                : `❌ Not quite — correct: ${normalize(current.correct).join(", ")}`}
            </div>
          )}

          {/* Navigation */}
          <div className="nav">
            <button className="btn" onClick={goPrev} disabled={isFirst}>
              ← Back
            </button>

            <div className="nav-center muted">
              {selected.size > 0 ? "Answered" : "Not answered yet"}
            </div>

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

        {/* Review (after submit) */}
        {submitted && (
          <section className="card review">
            <h3 className="title">Review</h3>
            <div className="tiny muted">Swipe/scroll for details.</div>

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
                        Your: <b>{sel.length ? sel.join(", ") : "—"}</b> • Correct:{" "}
                        <b>{corr.join(", ")}</b>
                      </div>
                    </div>
                    <div className="review-right">{ok ? "✅" : "❌"}</div>
                  </button>
                );
              })}
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
