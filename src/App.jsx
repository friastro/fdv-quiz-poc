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

function getChapterNumber(q) {
  const id = String(q?.id ?? "").trim();
  const m = id.match(/^(\d+)\./);
  if (m) return Number(m[1]);
  return null;
}

function buildRelabeledOptions(question, shuffleOptions) {
  const letters = ["A", "B", "C", "D", "E", "F"];

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

function calcQuestionScoreJudgement({ optionKeys, judgementMap, correctArr }) {
  const correct = new Set(correctArr || []);
  let wrongCount = 0;

  for (const k of optionKeys) {
    const truthIsCorrect = correct.has(k);
    const j = judgementMap?.[k] || "";

    if (j === "") {
      wrongCount += 1;
      continue;
    }

    const judgedCorrect = j === "C";
    if (judgedCorrect !== truthIsCorrect) wrongCount += 1;
  }

  const total = optionKeys.length;
  if (wrongCount >= total / 2) return { points: 0, wrongCount };

  return { points: total - wrongCount, wrongCount };
}

export default function App() {
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);

  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [retryMode, setRetryMode] = useState(false);
  const [retryQuiz, setRetryQuiz] = useState([]);

  const chapters = useMemo(() => {
    const nums = QUESTIONS.map(getChapterNumber).filter(Boolean);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, []);

  const filtered = useMemo(() => {
    if (!selectedChapters.length) return [];
    const s = new Set(selectedChapters);
    return QUESTIONS.filter((q) => s.has(getChapterNumber(q)));
  }, [selectedChapters]);

  const quiz = useMemo(() => {
    if (!quizStarted) return [];
    let base = filtered.slice();
    if (shuffleQuestions) base = shuffleArray(base);
    return base.slice(0, Math.min(questionCount, base.length));
  }, [quizStarted, filtered, shuffleQuestions, questionCount]);

  const optionPack = useMemo(() => {
    const map = {};
    for (const q of quiz) map[q.id] = buildRelabeledOptions(q, shuffleOptions);
    return map;
  }, [quiz, shuffleOptions]);

  const activeQuiz = retryMode ? retryQuiz : quiz;
  const current = activeQuiz[index];

  function setJudgement(qid, key, value) {
    if (submitted) return;
    setAnswers((prev) => {
      const curr = { ...(prev[qid] || {}) };
      curr[key] = curr[key] === value ? "" : value;
      return { ...prev, [qid]: curr };
    });
  }

  function startRetryWrong() {
    const wrong = quiz.filter((q) => {
      const pack = optionPack[q.id];
      const keys = pack.options.map((o) => o.key);
      const res = calcQuestionScoreJudgement({
        optionKeys: keys,
        judgementMap: answers[q.id] || {},
        correctArr: pack.correct
      });
      return res.points < keys.length;
    });

    if (!wrong.length) return;

    setAnswers({});
    setRetryQuiz(wrong);
    setRetryMode(true);
    setSubmitted(false);
    setIndex(0);
  }

  if (!quizStarted) {
    return (
      <div className="container">
        <h2>Select Chapters</h2>

        {chapters.map((ch) => (
          <label key={ch} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={selectedChapters.includes(ch)}
              onChange={(e) => {
                if (e.target.checked)
                  setSelectedChapters((p) => [...p, ch]);
                else
                  setSelectedChapters((p) => p.filter((x) => x !== ch));
              }}
            />
            Chapter {ch}
          </label>
        ))}

        <div style={{ marginTop: 20 }}>
          <label>
            Number of questions:{" "}
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            disabled={!selectedChapters.length}
            onClick={() => setQuizStarted(true)}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const pack = optionPack[current.id];
  const keys = pack.options.map((o) => o.key);

  const res = calcQuestionScoreJudgement({
    optionKeys: keys,
    judgementMap: answers[current.id] || {},
    correctArr: pack.correct
  });

  return (
    <div className="container">
      <h3>
        Question {index + 1} / {activeQuiz.length}
      </h3>

      <h2>{current.question}</h2>

      {pack.options.map(({ key, text }) => {
        const j = answers[current.id]?.[key] || "";

        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <b>{key}.</b> {text}
            <div>
              <button
                onClick={() => setJudgement(current.id, key, "C")}
                style={{ background: j === "C" ? "lightgreen" : "" }}
              >
                ➕
              </button>
              <button
                onClick={() => setJudgement(current.id, key, "W")}
                style={{ background: j === "W" ? "salmon" : "" }}
              >
                ➖
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20 }}>
        Points: {res.points} / {keys.length}
      </div>

      <div style={{ marginTop: 20 }}>
        {index > 0 && (
          <button onClick={() => setIndex((i) => i - 1)}>Back</button>
        )}
        {index < activeQuiz.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)}>Next</button>
        ) : (
          <button onClick={() => setSubmitted(true)}>Submit</button>
        )}
      </div>

      {submitted && !retryMode && (
        <div style={{ marginTop: 20 }}>
          <button onClick={startRetryWrong}>
            Retry wrong questions
          </button>
        </div>
      )}
    </div>
  );
}
