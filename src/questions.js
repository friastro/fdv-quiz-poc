export const QUESTIONS = [
    {
      id: "q1",
      question: "Which statements are correct? (Example multi-select)",
      options: {
        A: "Option A",
        B: "Option B",
        C: "Option C",
        D: "Option D"
      },
      correct: ["B", "D"]
    },
    {
      id: "q2",
      question: "Single correct example",
      options: { A: "Red", B: "Blue", C: "Green" },
      correct: ["B"]
    },
    {
      id: "q3",
      question: "Pick all that apply",
      options: { A: "One", B: "Two", C: "Three" },
      correct: ["A", "C"]
    },
    {
      id: "q4",
      question: "Another single correct",
      options: { A: "Yes", B: "No" },
      correct: ["A"]
    },
    {
      id: "q5",
      question: "Final question",
      options: { A: "Alpha", B: "Beta", C: "Gamma", D: "Delta" },
      correct: ["C"]
    }
  ];
  