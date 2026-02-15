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
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      <header style={{ position: "sticky", top: 0, background: "white", paddingBottom: 8, zIndex: 10 }}>
        <h2 style={{ margin: 0 }}>FDV Quiz PoC (5 questions)</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button onClick={reset} style={{ padding: "10px 12px" }}>Restart</button>
          {!submitted ? (
            <button onClick={() => setSubmitted(true)} style={{ padding: "10px 12px", fontWeight: 700 }}>
              Submit
            </button>
          ) : (
            <span style={{ fontWeight: 700 }}>
              Score: {score.ok}/{score.total} ({score.pct.toFixed(1)}%)
            </span>
          )}
        </div>
        <hr />
      </header>

      {quiz.map((q, idx) => {
        const selected = new Set(answers[q.id] || []);
        return (
          <section key={q.id} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 8 }}>
              {idx + 1}) {q.question}
            </h3>

            <div style={{ display: "grid", gap: 10 }}>
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
                    onClick={() => toggle(q.id, key)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      background: isSel ? "#f2f2f2" : "white",
                      lineHeight: 1.35,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <b>{key}.</b> {text}
                      </div>
                      <div style={{ whiteSpace: "nowrap", opacity: 0.85 }}>{badge}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                {same(answers[q.id], q.correct) ? "✅ Correct" : `❌ Incorrect — correct: ${q.correct.join(", ")}`}
              </div>
            )}

            <hr style={{ marginTop: 16 }} />
          </section>
        );
      })}
    </div>
  );
}
