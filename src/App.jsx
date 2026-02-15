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

function getChapterNumber(q) {
  const id = String(q?.id ?? "").trim();
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  if (typeof q?.chapterNumber === "number") return q.chapterNumber;
  return null;
}

/**
 * Supports options in two formats:
 * 1) options: { A: "text", B: "text" }
 * 2) options: { A: {text:"...", image:"/img/a.png"}, ... }
 *
 * Shuffles options, RELABELS A,B,C... according to new order,
 * and remaps correct answers accordingly.
 */
function buildRelabeledOptions(question, shuffleOptions) {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];

  const entries = Object.entries(question.options).map(([origKey, val]) => {
    const upKey = String(origKey).toUpperCase();
    if (typeof val === "string") {
      return { origKey: upKey, text: val, image: null };
    }
    return {
      origKey: upKey,
      text: val?.text ?? "",
      image: val?.image ?? null
    };
  });

  const ordered = shuffleOptions ? shuffleArray(entries) : entries;

  const relabeled = ordered.map((it, idx) => ({
    key: letters[idx],
    text: it.text,
    image: it.image,
    origKey: it.origKey
  }));

  const mapOrigToNew = {};
  for (const it of relabeled) mapOrigToNew[it.origKey] = it.key;

  const newCorrect = (question.correct || [])
    .map((c) => mapOrigToNew[String(c).toUpperCase()])
    .filter(Boolean);

  return { options: relabeled, correct: newCorrect };
}

/**
 * Judgement model:
 * - For each option key, user sets:
 *   "C" = user says option is Correct
 *   "W" = user says option is Wrong
 *   ""  = undecided (counts as wrong)
 *
 * Truth is: option is correct iff it is in correctArr.
 *
 * wrongCount = number of options where judgement != truth (or undecided)
 * points = totalOptions - wrongCount
 * if wrongCount >= totalOptions/2 => 0 points
 */
function calcQuestionScoreJudgement({ optionKeys, judgementMap, correctArr }) {
  const correct = new Set(correctArr || []);
  let wrongCount = 0;

  for (const k of optionKeys) {
    const truthIsCorrect = correct.has(k);
    const j = judgementMap?.[k] || ""; // "C" | "W" | ""

    if (j === "") {
      wrongCount += 1; // undecided counts as wrong
      continue;
    }

    const judgedCorrect = j === "C";
    if (judgedCorrect !== truthIsCorrect) wrongCount += 1;
  }

  const totalOptions = optionKeys.length;

  if (wrongCount >= totalOptions / 2) {
    return { points: 0, wrongCount };
  }

  const points = Math.max(0, Math.min(totalOptions, totalOptions - wrongCount));
  return { points, wrongCount };
}

function Img({ src, alt, variant }) {
  if (!src) return null;

  const style =
    variant === "option"
      ? {
          width: "100%",
          maxHeight: 220,
          objectFit: "contain",
          borderRadius: 14,
          border: "1px solid rgba(17,24,39,0.10)",
          background: "#fff"
        }
      : {
          width: "100%",
          maxHeight: 320,
          objectFit: "contain",
          borderRadius: 18,
          border: "1px solid rgba(17,24,39,0.10)",
          background: "#fff",
          marginTop: 12
        };

  return <img src={src} alt={alt || "image"} loading="lazy" style={style} />;
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

  /**
   * NEW: answers[qid] is an object:
   * { A:"C"|"W"|"" , B:"C"|"W"|"" , ... }
   */
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Detect chapters
  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter((x) => Number.isFinite(x));
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  // Filter by selected chapters
  const filtered = useMemo(() => {
    if (!selectedChapters.length) return [];
    const s = new Set(selectedChapters);
    return QUESTIONS.filter((q) => s.has(getChapterNumber(q)));
  }, [selectedChapters]);

  // Build quiz when started
  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    const base = filtered.slice();
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filtered, shuffleQuestions]);

  // Build per-question option order + remapped correct answers
  const optionPack = useMemo(() => {
    const map = {};
    for (const q of quiz) map[q.id] = buildRelabeledOptions(q, shuffleOptions);
    return map;
  }, [quiz, shuffleOptions]);

  const current = quiz[index];

  // Progress: "answered" = all options judged (no "")
  const progress = useMemo(() => {
    const total = quiz.length || 0;
    const answered = quiz.reduce((acc, q) => {
      const pack = optionPack[q.id];
      if (!pack) return acc;
      const keys = pack.options.map((o) => o.key);
      const m = answers[q.id] || {};
      const allDecided = keys.every((k) => m[k] === "C" || m[k] === "W");
      return acc + (allDecided ? 1 : 0);
    }, 0);

    const step = total ? index + 1 : 0;
    const pct = total ? (step / total) * 100 : 0;
    return { total, answered, step, pct };
  }, [quiz, optionPack, answers, index]);

  // Total score after submit
  const score = useMemo(() => {
    if (!submitted) return null;

    let points = 0;
    let maxPoints = 0;

    for (const q of quiz) {
      const pack = optionPack[q.id];
      if (!pack) continue;

      const keys = pack.options.map((o) => o.key);
      const res = calcQuestionScoreJudgement({
        optionKeys: keys,
        judgementMap: answers[q.id] || {},
        correctArr: pack.correct
      });

      points += res.points;
      maxPoints += keys.length;
    }

    return { points, maxPoints, pct: maxPoints ? (points / maxPoints) * 100 : 0 };
  }, [submitted, quiz, optionPack, answers]);

  function setJudgement(qid, optKey, value) {
    if (submitted) return;
    setAnswers((prev) => {
      const curr = { ...(prev[qid] || {}) };
      // toggle: clicking same value clears back to ""
      curr[optKey] = curr[optKey] === value ? "" : value;
      return { ...prev, [qid]: curr };
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

  /* ---------------- Start screen ---------------- */

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
                <span>Practice mode (show feedback)</span>
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
  const keys = pack.options.map((o) => o.key);
  const judgementMap = answers[current.id] || {};
  const truthCorrectSet = new Set(pack.correct);

  const isFirst = index === 0;
  const isLast = index === quiz.length - 1;

  const { points: currentPoints, wrongCount } = calcQuestionScoreJudgement({
    optionKeys: keys,
    judgementMap,
    correctArr: pack.correct
  });

  const showPracticeFeedback = practiceMode && !submitted;

  return (
    <div className="safe-area">
      <div className="container">
        <header className="topbar">
          <div className="topbar-left">
            <div className="appname">FDV Quiz PoC</div>
            <div className="subtle">
              Question <b>{progress.step}</b> / {progress.total} • Fully decided <b>{progress.answered}</b> • This
              question: <b>{currentPoints}</b>/{keys.length} (wrong: {wrongCount})
            </div>
          </div>

          <div className="topbar-right" style={{ gap: 8, flexDirection: "row" }}>
            <button className="btn" onClick={() => backToChapters(true)}>
              Chapters
            </button>

            {!submitted ? (
              <button className="btn btn-primary" onClick={() => setSubmitted(true)} disabled={progress.answered === 0}>
                Submit
              </button>
            ) : (
              <div className="pill">
                Score: <b>{score.points}</b>/{score.maxPoints} ({score.pct.toFixed(1)}%)
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
              <input type="checkbox" checked={showComments} onChange={(e) => setShowComments(e.target.checked)} />
              <span>Show comments</span>
            </label>
          </div>

          <div className="tiny muted">Tap ➕ if you think the option is correct, ➖ if you think it is wrong.</div>
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

          {/* Question image (optional) */}
          <Img src={current.image} alt={`Question ${current.id}`} variant="question" />

          {/* Optional comment */}
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

          {/* Options */}
          <div className="options" style={{ marginTop: 12 }}>
            {pack.options.map(({ key, text, image }) => {
              const j = judgementMap[key] || ""; // "C"|"W"|""
              const truthIsCorrect = truthCorrectSet.has(key);

              // feedback badge + state class
              let badge = "";
              let stateClass = "";

              if (submitted || showPracticeFeedback) {
                if (j === "") {
                  badge = "⚪";
                  stateClass = "";
                } else {
                  const judgedCorrect = j === "C";
                  const ok = judgedCorrect === truthIsCorrect;
                  badge = ok ? "✅" : "❌";
                  stateClass = ok ? "opt-correct" : "opt-wrong";
                }
              }

              return (
                <div key={key} className={`option ${stateClass}`}>
                  <div className="option-row" style={{ alignItems: "flex-start" }}>
                    <div className="option-text" style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <span className="optkey">{key}.</span> {text}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button
                            className={`btn ${j === "C" ? "btn-primary" : ""}`}
                            onClick={() => setJudgement(current.id, key, "C")}
                            disabled={submitted}
                            type="button"
                            aria-label={`Mark ${key} as correct`}
                          >
                            ➕
                          </button>

                          <button
                            className={`btn ${j === "W" ? "btn-primary" : ""}`}
                            onClick={() => setJudgement(current.id, key, "W")}
                            disabled={submitted}
                            type="button"
                            aria-label={`Mark ${key} as wrong`}
                          >
                            ➖
                          </button>
                        </div>
                      </div>

                      <Img src={image} alt={`Option ${key}`} variant="option" />
                    </div>

                    <div className="option-badge">{badge}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="nav">
            <button className="btn" onClick={goPrev} disabled={isFirst}>
              ← Back
            </button>

            <div className="nav-center muted">
              {keys.every((k) => judgementMap[k] === "C" || judgementMap[k] === "W")
                ? "All options judged"
                : "Judge all options (➕/➖)"}
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

        {/* Review */}
        {submitted && (
          <section className="card review">
            <h3 className="title">Review</h3>
            <div className="tiny muted">Tap an item to jump to that question.</div>

            <div className="review-list">
              {quiz.map((q, i) => {
                const packQ = optionPack[q.id];
                const keysQ = packQ.options.map((o) => o.key);

                const res = calcQuestionScoreJudgement({
                  optionKeys: keysQ,
                  judgementMap: answers[q.id] || {},
                  correctArr: packQ.correct
                });

                const perfect = res.points === keysQ.length;

                return (
                  <button
                    key={q.id}
                    className={`review-item ${perfect ? "ok" : "bad"}`}
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
                        Points: <b>{res.points}</b>/{keysQ.length} • Wrong: <b>{res.wrongCount}</b>
                      </div>
                    </div>
                    <div className="review-right">{perfect ? "✅" : "❌"}</div>
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
