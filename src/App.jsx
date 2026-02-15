import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

/* ---------------- helpers ---------------- */

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
  const id = String(q?.id ?? "").trim();
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  if (typeof q?.chapterNumber === "number") return q.chapterNumber;
  return null;
}

/**
 * Shuffle options + relabel A,B,C... according to new order,
 * and remap correct answers accordingly.
 */
function buildRelabeledOptions(question, shuffleOptions) {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];

  const entries = Object.entries(question.options).map(([origKey, text]) => ({
    origKey: String(origKey).toUpperCase(),
    text
  }));

  const ordered = shuffleOptions ? shuffleArray(entries) : entries;

  const relabeled = ordered.map((it, idx) => ({
    key: letters[idx],
    text: it.text,
    origKey: it.origKey
  }));

  const mapOrigToNew = {};
  for (const it of relabeled) mapOrigToNew[it.origKey] = it.key;

  const newCorrect = (question.correct || [])
    .map((c) => mapOrigToNew[String(c).toUpperCase()])
    .filter(Boolean);

  return { options: relabeled, correct: newCorrect };
}

/* ---------------- App ---------------- */

export default function App() {
  // Start screen
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);

  // Toggles
  const [practiceMode, setPracticeMode] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showComments, setShowComments] = useState(true);

  // Quiz state
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Detect available chapters from IDs
  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter((x) => Number.isFinite(x));
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  // Filter by chosen chapters
  const filtered = useMemo(() => {
    if (!selectedChapters.length) return [];
    const s = new Set(selectedChapters);
    return QUESTIONS.filter((q) => s.has(getChapterNumber(q)));
  }, [selectedChapters]);

  // Build quiz list when started (question shuffle)
  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    const base = filtered.slice();
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filtered, shuffleQuestions]);

  // Build per-question option order + remapped correct answers (option shuffle + relabel)
  // Memo ensures: no reshuffle on every render.
  const optionPack = useMemo(() => {
    const map = {};
    for (const q of quiz) map[q.id] = buildRelabeledOptions(q, shuffleOptions);
    return map;
  }, [quiz, shuffleOptions]);

  const current = quiz[index];

  const progress = useMemo(() => {
    const total = quiz.length || 0;
    const answered = quiz.reduce(
      (acc, q) => acc + ((answers[q.id] || []).length > 0 ? 1 : 0),
      0
    );
    const step = total ? index + 1 : 0;
    const pct = total ? (step / total) * 100 : 0;
    return { total, answered, step, pct };
  }, [quiz, answers, index]);

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      const corr = optionPack[q.id]?.correct ?? [];
      if (same(answers[q.id], corr)) ok += 1;
    }
    return { ok, total: quiz.length, pct: quiz.length ? (ok / quiz.length) * 100 : 0 };
  }, [submitted, answers, quiz, optionPack]);

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

  function backToChapters(keepSelection = true) {
    setQuizStarted(false);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
    if (!keepSelection) setSelectedChapters([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- Start screen (chapter selection) ---------------- */

  if (!quizStarted) {
    const allSelected = chapters.length > 0 && selectedChapters.length === chapters.length;

    return (
      <div className="safe-area">
        <div className="container">
          <header className="topbar" style={{ position: "relative" }}>
            <div className="topbar-left">
              <div className="appname">FDV Quiz PoC</div>
              <div className="subtle">Select chapters, then start.</div>
            </div>
          </header>

          <section className="card">
            <h3 className="title">Chapter selection</h3>

            <div className="settings-row" style={{ marginTop: 10 }}>
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
                <span>Shuffle options (relabels A–D)</span>
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showComments}
                  onChange={(e) => setShowComments(e.target.checked)}
                />
                <span>Show comments</span>
              </label>
            </div>

            <div className="nav" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <button className="btn" onClick={() => setSelectedChapters(chapters)} disabled={allSelected}>
                Select all
              </button>
              <button className="btn" onClick={() => setSelectedChapters([])} disabled={!selectedChapters.length}>
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setQuizStarted(true)}
                disabled={!selectedChapters.length}
                title={!selectedChapters.length ? "Select at least one chapter" : "Start quiz"}
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

          <footer className="footer tiny muted">Public PoC • Runs fully in-browser • No tracking</footer>
        </div>
      </div>
    );
  }

  /* ---------------- Quiz screen ---------------- */

  if (!current) {
    return (
      <div className="safe-area">
        <div className="container">
          <section className="card">
            <h3 className="title">No questions for selected chapter(s)</h3>
            <div className="tiny muted" style={{ marginBottom: 12 }}>
              Go back and pick different chapters.
            </div>
            <button className="btn btn-primary" onClick={() => backToChapters(false)}>
              Back to chapters
            </button>
          </section>
        </div>
      </div>
    );
  }

  const pack = optionPack[current.id];
  const correctNow = pack?.correct ?? [];
  const selected = new Set(answers[current.id] || []);
  const isFirst = index === 0;
  const isLast = index === quiz.length - 1;

  const showPracticeFeedback = practiceMode && !submitted && (answers[current.id] || []).length > 0;
  const currentIsCorrect = same(answers[current.id], correctNow);

  return (
    <div className="safe-area">
      <div className="container">
        <header className="topbar">
          <div className="topbar-left">
            <div className="appname">FDV Quiz PoC</div>
            <div className="subtle">
              Question <b>{progress.step}</b> / {progress.total} • Answered <b>{progress.answered}</b>
            </div>
          </div>

          <div className="topbar-right" style={{ gap: 8, flexDirection: "row" }}>
            <button className="btn" onClick={() => backToChapters(true)}>
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

        {/* Settings card */}
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
              <span>Shuffle options (relabels A–D)</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={showComments}
                onChange={(e) => setShowComments(e.target.checked)}
                disabled={submitted ? false : false}
              />
              <span>Show comments</span>
            </label>
          </div>
          <div className="tiny muted">
            Tip: To re-randomize question order, go back to <b>Chapters</b> and Start again.
          </div>
        </section>

        {/* Question */}
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

          {/* Optional Comment box */}
          {showComments && current.comment && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 14,
                background: "rgba(59, 130, 246, 0.10)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                fontSize: 14
              }}
            >
              💬 <b>Comment:</b> {current.comment}
            </div>
          )}

          <div className="options" style={{ marginTop: 12 }}>
            {pack.options.map(({ key, text }) => {
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
              {currentIsCorrect ? "✅ Correct" : `❌ Not quite — correct: ${normalize(correctNow).join(", ")}`}
            </div>
          )}

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
                const packQ = optionPack[q.id];
                const corr = normalize(packQ?.correct ?? []);
                const sel = normalize(answers[q.id] || []);
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
              <button className="btn" onClick={() => backToChapters(true)}>
                Back to chapters
              </button>
              <button className="btn btn-primary" onClick={() => backToChapters(false)}>
                Change chapters
              </button>
            </div>
          </section>
        )}

        <footer className="footer tiny muted">Public PoC • Runs fully in-browser • No tracking</footer>
      </div>
    </div>
  );
}
