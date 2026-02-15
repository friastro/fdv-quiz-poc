import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

function normalize(arr) {
  return [...new Set((arr || []).map((x) => String(x).toUpperCase()))].sort();
}

function same(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return na.length === nb.length && na.every((v, i) => v === nb[i]);
}

export default function App() {
  const quiz = useMemo(() => QUESTIONS, []);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      if (same(answers[q.id], q.correct)) ok += 1;
    }
    return { ok, total: quiz.length, pct: (ok / quiz.length) * 100 };
  }, [submitted, answers, quiz]);

  function toggle(qid, opt) {
    if (submitted) return;
    setAnswers((prev) => {
      const curr = new Set(prev[qid] || []);
      if (curr.has(opt)) curr.delete(opt);
      else curr.add(opt);
      return { ...prev, [qid]: Array.from(curr) };
    });
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="safe-area">
      <div className="container">
        <header className="header">
          <h2 className="header-title">FDV Quiz PoC</h2>

          <div className="header-actions">
            <button className="btn" onClick={reset}>
              Restart
            </button>

            {!submitted ? (
              <button className="btn btn-primary" onClick={() => setSubmitted(true)}>
                Submit
              </button>
            ) : (
              <span className="badge-score">
                Score: {score.ok}/{score.total} ({score.pct.toFixed(1)}%)
              </span>
            )}
          </div>
        </header>

        {quiz.map((q, idx) => {
          const selected = new Set(answers[q.id] || []);
          return (
            <section key={q.id} className="question">
              <h3 className="question-title">
                {idx + 1}) {q.question}
              </h3>

              {(q.chapter || q.source) && (
                <div className="question-meta">
                  {[q.chapter, q.source].filter(Boolean).join(" • ")}
                </div>
              )}

              <div className="options">
                {Object.entries(q.options).map(([key, text]) => {
                  const isSel = selected.has(key);
                  const isCorr = q.correct.includes(key);

                  let badge = "";
                  if (submitted) {
                    if (isCorr && isSel) badge = "✅ correct";
                    else if (isCorr && !isSel) badge = "🟩 correct";
                    else if (!isCorr && isSel) badge = "❌ selected";
                  }

                  return (
                    <button
                      key={key}
                      className={`option-btn ${isSel ? "selected" : ""}`}
                      onClick={() => toggle(q.id, key)}
                    >
                      <div className="option-row">
                        <div>
                          <b>{key}.</b> {text}
                        </div>
                        <div className="option-badge">{badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="result">
                  {same(answers[q.id], q.correct)
                    ? "✅ Correct"
                    : `❌ Incorrect — correct: ${q.correct.join(", ")}`}
                </div>
              )}

              <hr className="hr" />
            </section>
          );
        })}
      </div>
    </div>
  );
}
