import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
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

export default function App() {
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Get available chapters automatically
  const chapters = useMemo(() => {
    const unique = [...new Set(QUESTIONS.map(q => q.chapterNumber))];
    return unique.sort((a, b) => a - b);
  }, []);

  // Filter quiz based on chapter
  const quiz = useMemo(() => {
    if (!selectedChapter) return [];
    return shuffleArray(
      QUESTIONS.filter(q => q.chapterNumber === selectedChapter)
    );
  }, [selectedChapter]);

  const current = quiz[index];

  function toggleAnswer(qid, opt) {
    if (submitted) return;
    setAnswers(prev => {
      const curr = new Set(prev[qid] || []);
      if (curr.has(opt)) curr.delete(opt);
      else curr.add(opt);
      return { ...prev, [qid]: Array.from(curr) };
    });
  }

  function restart() {
    setSelectedChapter(null);
    setAnswers({});
    setIndex(0);
    setSubmitted(false);
  }

  if (!selectedChapter) {
    return (
      <div className="container">
        <h2>Select Chapter</h2>
        {chapters.map(ch => (
          <button
            key={ch}
            className="btn btn-primary"
            style={{ margin: "8px 0", width: "100%" }}
            onClick={() => setSelectedChapter(ch)}
          >
            Chapter {ch}
          </button>
        ))}
      </div>
    );
  }

  if (!current) return null;

  const selected = new Set(answers[current.id] || []);

  return (
    <div className="container">
      <h2>Chapter {selectedChapter}</h2>

      <p><b>{index + 1}</b> / {quiz.length}</p>

      <h3>{current.question}</h3>

      {Object.entries(current.options).map(([key, text]) => {
        const isSel = selected.has(key);
        const isCorr = current.correct.includes(key);

        let badge = "";
        if (submitted) {
          if (isCorr && isSel) badge = "✅";
          else if (!isCorr && isSel) badge = "❌";
        }

        return (
          <button
            key={key}
            className="btn"
            style={{
              display: "block",
              margin: "6px 0",
              background: isSel ? "#eee" : "#fff"
            }}
            onClick={() => toggleAnswer(current.id, key)}
          >
            <b>{key}.</b> {text} {badge}
          </button>
        );
      })}

      <div style={{ marginTop: 16 }}>
        {index > 0 && (
          <button className="btn" onClick={() => setIndex(index - 1)}>
            Back
          </button>
        )}

        {index < quiz.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setSubmitted(true)}>
            Submit
          </button>
        )}
      </div>

      {submitted && (
        <div style={{ marginTop: 20 }}>
          <h3>Results</h3>
          {quiz.map(q => (
            <div key={q.id}>
              {same(answers[q.id], q.correct) ? "✅" : "❌"} {q.question}
            </div>
          ))}
          <button className="btn" onClick={restart}>
            Back to Chapters
          </button>
        </div>
      )}
    </div>
  );
}
