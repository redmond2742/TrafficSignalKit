/**
 * Practice quiz questions: reading them from CSV, and scoring answers.
 *
 * Every quiz is turned into one shape before the page sees it:
 *
 *   { question, options: [{ key: "A", text }, ...], answer: "A" }
 *
 * and an answer sheet is the chosen key for each question, by index.
 *
 * The quizzes in stores/data.js came in two shapes. Two listed options as
 * plain text with the answer as text; Traffic Signal Tech Quiz 1 keyed them
 * A to D with the answer as a letter. The page saved the chosen option's text
 * and compared it with the letter, so no answer on that quiz could ever be
 * marked right. With keys throughout, nothing is compared as free text.
 *
 * Scoring is worked out from the whole answer sheet when asked, rather than
 * added to as the quiz is clicked through: it used to be, so going Back and
 * then Next scored a question twice.
 *
 * Framework free, so it runs under `node --test`.
 */

const KEYS = "ABCDEFGHIJ";

/**
 * Rows of fields from CSV text (RFC 4180): quoted fields may hold commas,
 * line breaks and doubled quotes. A byte order mark and CRLF line ends, both
 * what Excel saves, are fine.
 */
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  // blank lines, including the one a trailing newline leaves
  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

const quote = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * A quiz from CSV with a header row:
 *
 *   number,question,option_a,option_b,option_c,option_d,answer
 *
 * Any number of option_ columns, A onward; a blank one is a question with
 * fewer choices. `answer` is the letter of the right option. Throws, naming
 * the row, on anything that would make a question unanswerable, so a bad
 * edit fails the tests rather than marking every taker wrong.
 */
export function quizFromCsv(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("The quiz CSV is empty.");
  const columns = header.map((name) => name.trim().toLowerCase());
  const col = (name) => columns.indexOf(name);
  const questionCol = col("question");
  const answerCol = col("answer");
  const optionCols = columns
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => /^option_[a-j]$/.test(name))
    .map(({ name, index }) => ({ key: name.slice(-1).toUpperCase(), index }));
  if (questionCol < 0 || answerCol < 0 || optionCols.length < 2) {
    throw new Error("The quiz CSV needs question, option_a, option_b and answer columns.");
  }
  return rows.map((row, i) => {
    const line = i + 2; // the header is line 1
    const question = (row[questionCol] || "").trim();
    const options = optionCols
      .map(({ key, index }) => ({ key, text: (row[index] || "").trim() }))
      .filter((option) => option.text);
    const answer = (row[answerCol] || "").trim().toUpperCase();
    if (!question) throw new Error(`Line ${line}: no question.`);
    if (options.length < 2) throw new Error(`Line ${line}: fewer than two options.`);
    if (!options.some((option) => option.key === answer)) {
      throw new Error(`Line ${line}: the answer "${answer}" is not one of its options.`);
    }
    return { question, options, answer };
  });
}

/** A quiz as CSV, in the shape quizFromCsv reads. */
export function quizToCsv(questions) {
  const width = Math.max(...questions.map((q) => q.options.length));
  const header = [
    "number",
    "question",
    ...Array.from({ length: width }, (_, i) => `option_${KEYS[i].toLowerCase()}`),
    "answer",
  ];
  const lines = questions.map((q, i) => [
    i + 1,
    q.question,
    ...Array.from({ length: width }, (_, j) => q.options[j]?.text ?? ""),
    q.answer,
  ]);
  return [header, ...lines].map((cells) => cells.map(quote).join(",")).join("\n") + "\n";
}

/**
 * One question from stores/data.js in the shared shape, whichever of the two
 * old shapes it came in: options as a list with the answer as text, or keyed
 * by letter with the answer as a letter.
 */
export function normalizeQuestion(raw) {
  const options = Array.isArray(raw.options)
    ? raw.options.map((text, i) => ({ key: KEYS[i], text: String(text) }))
    : Object.entries(raw.options || {}).map(([key, text]) => ({ key: key.toUpperCase(), text: String(text) }));
  const given = String(raw.correctAnswer ?? raw.answer ?? "").trim();
  const byKey = options.find((option) => option.key === given.toUpperCase());
  const byText = options.find((option) => option.text.trim() === given);
  const match = Array.isArray(raw.options) ? byText || byKey : byKey || byText;
  if (!match) throw new Error(`No option matches the answer to "${raw.question}".`);
  return { question: String(raw.question), options, answer: match.key };
}

/**
 * The score for an answer sheet, and what happened on each question. An
 * unanswered question is wrong.
 */
export function scoreQuiz(questions, answers) {
  const results = (questions || []).map((q, index) => {
    const chosen = answers?.[index] ?? null;
    return { index, chosen, answer: q.answer, correct: chosen === q.answer };
  });
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  return { score, total, percent: total ? (score / total) * 100 : 0, results };
}
