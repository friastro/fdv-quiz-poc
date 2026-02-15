import { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";

/* ----------------- helpers ----------------- */

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
  const id = String(q?.id ?? "");
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  if (typeof q.chapterNumber === "number") return q.chapterNumber;
  return null;
}

/* --- shuffle + relabel answers A–D properly --- */
function buildOptionList(question, shuffleOptions) {
  const entries = Object.entries(question.options).map(([key, text]) => ({
    originalKey: key,
    text
  }));

  const shuffled = shuffleOptions ? shuffleArray(entries) : entries;

  const letters = ["A", "B", "C", "D", "E", "F", "G"];

  const remapped = shuffled.map((item, index) => ({
    key: letters[index],
    text: item.text,
    originalKey: item.originalKey
  }));

  const keyMap = {};
  remapped.forEach((item) => {
    keyMap[item.originalKey] = item.key;
  });

  const newCorrect = question.correct.map((c) => keyMap[c]);

  return {
    options: remapped,
    correct: newCorrect
  };
}

/* ----------------- APP ----------------- */

export default function App() {
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);

  const [practiceMode, setPracticeMode] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter((x) =>
      Number.isFinite(x)
    );
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  const filteredQuestions = useMemo(() => {
    if (!selectedChapters.length) return [];
    const set = new Set(selectedChapters);
    return QUESTIONS.filter((q) => set.has(getChapterNumber(q)));
  }, [selectedChapters]);

  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    const base = filteredQuestions.slice();
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filteredQuestions, shuffleQuestions]);

  const optionOrders = useMemo(() => {
    const map = {};
    for (const q of quiz) {
      map[q.id] = buildOptionList(q, shuffleOptions);
    }
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
      step: index + 1,
      pct: total ? ((index + 1) / total) * 100 : 0
    };
  }, [quiz, answers, index]);

  const score = useMemo(() => {
    if (!submitted) return null;
    let ok = 0;
    for (const q of quiz) {
      if (same(answers[q.id], optionOrders[q.id].correct)) ok++;
    }
    return {
      ok,
      total: quiz.length,
      pct: quiz.length ? (ok / quiz.length) * 100 : 0
    };
  }, [submitted, answers, quiz, optionOrders]);

  function toggleAnswer(qid, opt) {
    if (submitted) return;
    setAnswers((prev) => {
      const curr = new Set(prev[qid] || []);
      if (curr.has(opt)) curr.delete(opt);
      else curr.add(opt);
      return { ...prev, [qid]: Array.from(curr) };
    });
  }

  function restartToChapters() {
    setQuizStarted(false);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
  }

  /* --------- CHAPTER SELECTION SCREEN --------- */

  if (!quizStarted) {
    return (
      <div className="container">
        <h2>Select Chapters</h2>

        {chapters.map((ch) => (
          <label key={ch} style={{ display: "block", margin: "8px 0" }}>
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
            />
            {" "}Chapter {ch}
          </label>
        ))}

        <hr />

        <label>
          <input
            type="checkbox"
            checked={practiceMode}
            onChange={(e) => setPracticeMode(e.target.checked)}
          />
          {" "}Practice mode
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)}
          />
          {" "}Shuffle questions
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={shuffleOptions}
            onChange={(e) => setShuffleOptions(e.target.checked)}
          />
          {" "}Shuffle options
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

  /* --------- QUIZ --------- */

  if (!current) return null;

  const optionData = optionOrders[current.id];
  const correctNow = optionData.correct;
  const selected = new Set(answers[current.id] || []);

  return (
    <div className="container">
      <h3>
        Question {index + 1} / {quiz.length}
      </h3>

      <div
        style={{
          height: "10px",
          background: "#ddd",
          borderRadius: "10px",
          marginBottom: "12px"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress.pct}%`,
            background: "#111",
            borderRadius: "10px"
          }}
        />
      </div>

      <h2>{current.question}</h2>

      {optionData.options.map(({ key, text }) => {
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
            style={{
              display: "block",
              margin: "6px 0",
              padding: "8px",
              background: isSel ? "#eee" : "#fff"
            }}
            onClick={() => toggleAnswer(current.id, key)}
            disabled={submitted}
          >
            <b>{key}.</b> {text} {badge}
          </button>
        );
      })}

      <br />

      {index > 0 && (
        <button onClick={() => setIndex(index - 1)}>Back</button>
      )}

      {index < quiz.length - 1 ? (
        <button onClick={() => setIndex(index + 1)}>Next</button>
      ) : (
        <button onClick={() => setSubmitted(true)}>Submit</button>
      )}

      {submitted && (
        <>
          <h3>
            Score: {score.ok}/{score.total} ({score.pct.toFixed(1)}%)
          </h3>

          <button onClick={restartToChapters}>
            Back to Chapters
          </button>
        </>
      )}
    </div>
  );
}
