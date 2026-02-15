export const QUESTIONS = [
  {
    id: "1.16",
    chapterNumber: 1,
    chapter: "R300.1",
    source: "FDV: ►300.1 / 2.7.1",
    question: "Welche Aussagen betreffend Ausführung von sicherheitsrelevanten Funktionen treffen zu?",
    options: {
      A: "Wer sich krank fühlt darf keine sicherheitsrelevanten Funktionen ausführen",
      B: "Innert 6 Stunden vor Beginn dürfen keine alkoholischen Getränke konsumiert werden",
      C: "Bei Dienstantritt gilt 0.0‰ Alkohol",
      D: "Lokführer ist mitverantwortlich für Arbeits-/Ruhezeit"
    },
    correct: ["A", "C", "D"]
  },

  {
    id: "2.1",
    chapterNumber: 2,
    chapter: "R300.2",
    source: "FDV: ►300.2 / 1.1.1",
    question: "Der Lokführer kann ein Vorsignal nicht eindeutig erkennen. Die Zugbeeinflussung meldet jedoch Fahrt Wie hat sich der Lokführer zu verhalten?",
    options: {
      A: "Er hat am Hauptsignal 'Halt' zu erwarten",
      B: "Er reduziert auf 30 km/h",
      C: "Er fährt mit Fb1 weiter",
      D: "Er erkundet sich beim FDL"
    },
    correct: ["A"]
  },

  {
    id: "2.3",
    chapterNumber: 2,
    chapter: "R300.2",
    source: "FDV: ►300.2 / 1.2.2",
    question: "Was bedeutet das Signalbild 'Warnung' beim Vorsignal?",
    options: {
      A: "Das Hauptsignal zeigt Halt",
      B: "Das Hauptsignal kann Halt zeigen",
      C: "Das Hauptsignal zeigt Fahrt",
      D: "Das Hauptsignal ist ungültig"
    },
    correct: ["B"],
    comment: "Bei 'Warnung' ist mit Halt am Hauptsignal zu rechnen."
  },
  
  {
    id: "2.4",
    chapterNumber: 2,
    chapter: "R300.2",
    source: "FDV: ►300.2 / 1.3.1",
    question: "Wann darf ein Halt zeigendes Hauptsignal überfahren werden?",
    options: {
      A: "Bei Zustimmung des Fahrdienstleiters",
      B: "Wenn kein Gegenzug sichtbar ist",
      C: "Bei schriftlichem Befehl",
      D: "Bei Ausfall des Signals"
    },
    correct: ["A", "C"],
    comment: "Ein Halt zeigendes Signal darf nur mit entsprechender Erlaubnis überfahren werden."
  },
  
  {
    id: "2.5",
    chapterNumber: 2,
    chapter: "R300.2",
    source: "FDV: ►300.2 / 2.1.3",
    question: "Welche Geschwindigkeit gilt bei Fahrt auf Sicht?",
    options: {
      A: "Maximal 40 km/h",
      B: "Maximal 30 km/h",
      C: "So, dass rechtzeitig angehalten werden kann",
      D: "Maximal 20 km/h"
    },
    correct: ["C"],
    comment: "Fahrt auf Sicht bedeutet jederzeit vor einem Hindernis anhalten zu können."
  },

  {
    id: "2.6",
    chapterNumber: 2,
    chapter: "R300.2",
    source: "FDV: ►300.2 / 1.1.1",
    question: "Du triffst bei der Blockstelle Foral auf folgendes Signal (alle Linsen dunkel). Welche Aussagen treffen zu?",
    image: "/img/q2_2.png",
    options: {
      A: "Ich betrachte dieses Signal als Warnung und erwarte Halt beim Einfahrsignal",
      B: "Ich betrachte dieses Signal als Halt und halte vor diesem Signal an",
      C: "Wenn das Vorsignal Fahrt signalisiert hat darf an diesem Signal vorbei gefahren werden",
      D: "Nur wenn das Vorsignal Warnung signalisiert hat muss ich vor diesem Signal anhalten"
    },
    correct: ["B"],
    comment: "Mit diesem Aufsatz gilt dieses Signal als Hauptsignal (in der Grundstellung zeigt es Halt). FDV: ►300.2 / 5.1.5"
  },
  
];
