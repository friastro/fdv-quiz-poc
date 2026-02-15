import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

/* ---------------- helpers ---------------- */

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

function getChapterNumber(q) {
  const id = String(q?.id ?? "").trim();
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  if (typeof q?.chapterNumber === "number") return q.chapterNumber;
  return null;
}

/* Shuffle options + relabel A–D + remap correct answers */
function buildRelabeledOptions(question, shuffleOptions) {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const entries = Object.entries(question.options).map(([origKey, text]) => ({
    origKey,
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
  /* -------- Chapter Selection -------- */
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);

  /* -------- Feature Toggles -------- */
  const [practiceMode, setPracticeMode] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showComments, setShowComments] = useState(true);

  /* -------- Quiz Runtime -------- */
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter((x) =>
      Number.isFinite(x)
    );
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  const filtered = useMemo(() => {
    if (!selectedChapters.length) return [];
    const set = new Set(selectedChapters);
    return QUESTIONS.filter((q) => set.has(getChapterNumber(q)));
  }, [selectedChapters]);

  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    const base = filtered.slice();
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filtered, shuffleQuestions]);

  const optionPack = useMemo(() => {
    const map = {};
    for (const q of quiz) map[q.id] = buildRelabeledOptions(q, shuffleOptions);
    return map;
  }, [quiz, shuffleOptions]);

  const current = quiz[index];

  const progress = useMemo(() => {
    const total = quiz.length;
    const answered = quiz.reduce(
      (acc, q) => acc + ((answers[q.id] || []).length > 0 ? 1 : 0),
      0
    );
    return {
      total,
      answered,
      step: total ? index + 1 : 0,
      pct: total ? ((index + 1) / total) * 100 : 0
    };
  }, [quiz, answers, index]);

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      const corr = optionPack[q.id]?.correct ?? [];
      if (same(answers[q.id], corr)) ok++;
    }
    return {
      ok,
      total: quiz.length,
      pct: quiz.length ? (ok / quiz.length) * 100 : 0
    };
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
  }

  function goNext() {
    setIndex((i) => Math.min(quiz.length - 1, i + 1));
  }

  function backToChapters(clear = false) {
    setQuizStarted(false);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
    if (clear) setSelectedChapters([]);
  }

  /* -------- Chapter Selection Screen -------- */

  if (!quizStarted) {
    return (
      <div className="container">
        <h2>Select Chapters</h2>

        {chapters.map((ch) => (
          <label key={ch} style={{ display: "block", margin: "6px 0" }}>
            <input
              type="checkbox"
              checked={selectedChapters.includes(ch)}
              onChange={(e) => {
                if (e.target.checked)
                  setSelectedChapters((prev) => [...prev, ch]);
                else
                  setSelectedChapters((prev) =>
                    prev.filter((x) => x !== ch)
                  );
              }}
            />{" "}
            Chapter {ch}
          </label>
        ))}

        <hr />

        <label>
          <input
            type="checkbox"
            checked={practiceMode}
            onChange={(e) => setPracticeMode(e.target.checked)}
          />{" "}
          Practice mode
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)}
          />{" "}
          Shuffle questions
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={shuffleOptions}
            onChange={(e) => setShuffleOptions(e.target.checked)}
          />{" "}
          Shuffle options
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={showComments}
            onChange={(e) => setShowComments(e.target.checked)}
          />{" "}
          Show comments
        </label>

        <br /><br />

        <button
          onClick={() => setQuizStarted(true)}
          disabled={!selectedChapters.length}
        >
          Start Quiz
        </button>
      </div>
    );
  }

  /* -------- Quiz Screen -------- */

  if (!current) return null;

  const pack = optionPack[current.id];
  const correctNow = pack.correct;
  const selected = new Set(answers[current.id] || []);

  return (
    <div className="container">
      <h3>
        Question {progress.step} / {progress.total}
      </h3>

      <div
        style={{
          height: 8,
          background: "#ddd",
          borderRadius: 8,
          marginBottom: 10
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress.pct}%`,
            background: "#111",
            borderRadius: 8
          }}
        />
      </div>

      <h2>{current.question}</h2>

      {showComments && current.comment && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            background: "#eef6ff",
            border: "1px solid #3b82f6",
            fontSize: 14
          }}
        >
          💬 <b>Comment:</b> {current.comment}
        </div>
      )}

      {pack.options.map(({ key, text }) => {
        const isSel = selected.has(key);
        const isCorr = correctNow.includes(key);

        let badge = "";
        if (submitted) {
          if (isCorr && isSel) badge = "✅";
          else if (!isCorr && isSel) badge = "❌";
        } else if (practiceMode && isSel) {
          badge = isCorr ? "✅" : "❌";
        }

        return (
          <button
            key={key}
            onClick={() => toggleAnswer(current.id, key)}
            disabled={submitted}
            style={{
              display: "block",
              margin: "6px 0",
              padding: 8,
              background: isSel ? "#eee" : "#fff"
            }}
          >
            <b>{key}.</b> {text} {badge}
          </button>
        );
      })}

      <br />

      {index > 0 && <button onClick={goPrev}>Back</button>}

      {index < quiz.length - 1 ? (
        <button onClick={goNext}>Next</button>
      ) : (
        <button onClick={() => setSubmitted(true)}>Submit</button>
      )}

      {submitted && (
        <>
          <h3>
            Score: {score.ok}/{score.total} ({score.pct.toFixed(1)}%)
          </h3>

          <button onClick={() => backToChapters(false)}>
            Back to Chapters
          </button>
        </>
      )}
    </div>
  );
}
