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

/* ---------------- scoring ---------------- */

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

  if (wrongCount >= total / 2) {
    return { points: 0, wrongCount };
  }

  return {
    points: total - wrongCount,
    wrongCount
  };
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
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);

  const [practiceMode, setPracticeMode] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showComments, setShowComments] = useState(true);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

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
    const base = filtered.slice();
    return shuffleQuestions ? shuffleArray(base) : base;
  }, [quizStarted, filtered, shuffleQuestions]);

  const optionPack = useMemo(() => {
    const map = {};
    for (const q of quiz) map[q.id] = buildRelabeledOptions(q, shuffleOptions);
    return map;
  }, [quiz, shuffleOptions]);

  const current = quiz[index];

  const score = useMemo(() => {
    if (!submitted) return null;

    let points = 0;
    let maxPoints = 0;

    for (const q of quiz) {
      const pack = optionPack[q.id];
      const keys = pack.options.map((o) => o.key);

      const res = calcQuestionScoreJudgement({
        optionKeys: keys,
        judgementMap: answers[q.id] || {},
        correctArr: pack.correct
      });

      points += res.points;
      maxPoints += keys.length;
    }

    return {
      points,
      maxPoints,
      pct: maxPoints ? (points / maxPoints) * 100 : 0
    };
  }, [submitted, quiz, optionPack, answers]);

  function setJudgement(qid, optKey, value) {
    if (submitted) return;

    setAnswers((prev) => {
      const curr = { ...(prev[qid] || {}) };

      curr[optKey] = curr[optKey] === value ? "" : value;

      return { ...prev, [qid]: curr };
    });
  }

  function backToChapters() {
    setQuizStarted(false);
    setSubmitted(false);
    setAnswers({});
    setIndex(0);
  }

  /* ---------- START SCREEN ---------- */

  if (!quizStarted) {
    return (
      <div className="safe-area">
        <div className="container">
          <section className="card">
            <h3>Select Chapters</h3>

            {chapters.map((ch) => (
              <label key={ch} style={{ display: "block", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={selectedChapters.includes(ch)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedChapters((p) => [...p, ch]);
                    else
                      setSelectedChapters((p) =>
                        p.filter((x) => x !== ch)
                      );
                  }}
                />{" "}
                Chapter {ch}
              </label>
            ))}

            <button
              className="btn btn-primary"
              disabled={!selectedChapters.length}
              onClick={() => setQuizStarted(true)}
            >
              Start Quiz
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* ---------- QUIZ SCREEN ---------- */

  if (!current) return null;

  const pack = optionPack[current.id];
  const keys = pack.options.map((o) => o.key);
  const judgementMap = answers[current.id] || {};

  const res = calcQuestionScoreJudgement({
    optionKeys: keys,
    judgementMap,
    correctArr: pack.correct
  });

  return (
    <div className="safe-area">
      <div className="container">
        <section className="card">
          <h2>
            {index + 1}) {current.question}
          </h2>

          <Img src={current.image} variant="question" />

          {showComments && current.comment && (
            <div style={{ marginTop: 10 }}>{current.comment}</div>
          )}

          {pack.options.map(({ key, text, image }) => {
            const j = judgementMap[key] || "";

            return (
              <div key={key} className="option" style={{ marginBottom: 16 }}>
                <div>
                  <b>{key}.</b> {text}
                </div>

                <Img src={image} variant="option" />

                <div style={{ marginTop: 8 }}>
                  <button
                    className={`btn ${j === "C" ? "btn-primary" : ""}`}
                    onClick={() => setJudgement(current.id, key, "C")}
                  >
                    ➕
                  </button>

                  <button
                    className={`btn ${j === "W" ? "btn-primary" : ""}`}
                    onClick={() => setJudgement(current.id, key, "W")}
                    style={{ marginLeft: 6 }}
                  >
                    ➖
                  </button>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 20 }}>
            Points: {res.points} / {keys.length} (wrong: {res.wrongCount})
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              Back
            </button>

            {index < quiz.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => setIndex((i) => i + 1)}
                style={{ marginLeft: 10 }}
              >
                Next
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setSubmitted(true)}
                style={{ marginLeft: 10 }}
              >
                Submit
              </button>
            )}
          </div>

          {submitted && score && (
            <div style={{ marginTop: 20 }}>
              Total Score: {score.points} / {score.maxPoints} (
              {score.pct.toFixed(1)}%)
              <div>
                <button
                  className="btn"
                  onClick={backToChapters}
                  style={{ marginTop: 10 }}
                >
                  Back to Chapters
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
