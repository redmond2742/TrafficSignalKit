import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv, quizFromCsv, quizToCsv, normalizeQuestion, scoreQuiz } from '../src/utils/quiz.js';
import { quizData } from '../src/stores/data.js';

const techQuiz1 = fs.readFileSync(new URL('../src/data/quizzes/signal-tech-quiz-1.csv', import.meta.url), 'utf8');

test('Traffic Signal Tech Quiz 1 reads from its CSV: 15 questions, every answer one of its options', () => {
  const questions = quizFromCsv(techQuiz1);
  assert.equal(questions.length, 15);
  for (const q of questions) {
    assert.ok(q.options.some((o) => o.key === q.answer), q.question);
  }
  // the key as it stood in stores/data.js when it moved to the CSV
  assert.equal(questions.map((q) => q.answer).join(''), 'BAACAAADCBCCAAA');
  assert.equal(questions[0].options[1].text, 'To control and manage traffic flow');
});

/**
 * The bug: options were keyed A to D with the answer stored as a letter, but
 * the page saved the chosen option's text, so even a perfect sheet scored 0.
 */
test('a perfect answer sheet on the tech quiz scores full marks, an empty one none', () => {
  const questions = quizFromCsv(techQuiz1);
  const perfect = questions.map((q) => q.answer);
  assert.deepEqual(
    { score: scoreQuiz(questions, perfect).score, total: 15 },
    { score: 15, total: 15 },
  );
  assert.equal(scoreQuiz(questions, []).score, 0);
  const allWrong = questions.map((q) => q.options.find((o) => o.key !== q.answer).key);
  assert.equal(scoreQuiz(questions, allWrong).score, 0);
});

test('each question is marked on its own, whatever order it was answered in', () => {
  const questions = quizFromCsv(techQuiz1);
  const sheet = [];
  sheet[0] = 'B'; // right
  sheet[7] = 'C'; // wrong: ground is green
  sheet[14] = 'A'; // right
  sheet[0] = 'B'; // answered again after going Back: still one mark
  const { score, results } = scoreQuiz(questions, sheet);
  assert.equal(score, 2);
  assert.deepEqual(results.filter((r) => r.chosen).map((r) => [r.index, r.correct]), [[0, true], [7, false], [14, true]]);
  assert.equal(results[1].correct, false, 'unanswered is wrong');
});

test('the two older quizzes still score by their text answers', () => {
  for (const list of [quizData.funQuiz, quizData.homeDIY]) {
    const questions = list.map(normalizeQuestion);
    const perfect = questions.map((q) => q.answer);
    assert.equal(scoreQuiz(questions, perfect).score, list.length);
    questions.forEach((q, i) => {
      assert.equal(q.options.find((o) => o.key === q.answer).text, list[i].correctAnswer);
    });
  }
});

test('an updated CSV is read as edited: commas, quotes and line breaks in a field', () => {
  const csv = [
    'number,question,option_a,option_b,option_c,option_d,option_e,answer',
    '1,"If a signal is flashing red, what should drivers do?",Proceed,"Stop, then go when safe",Slow down,,,B',
    '2,"Which is the ""walk"" interval?",WALK,"Flashing',
    'DON\'T WALK",Steady DON\'T WALK,Dark,All of the above,e',
    '',
  ].join('\r\n');
  const [first, second] = quizFromCsv(`﻿${csv}`);
  assert.equal(first.question, 'If a signal is flashing red, what should drivers do?');
  assert.deepEqual(first.options.map((o) => o.key), ['A', 'B', 'C'], 'blank options are left out');
  assert.equal(first.answer, 'B');
  assert.equal(second.question, 'Which is the "walk" interval?');
  assert.equal(second.options[1].text, "Flashing\r\nDON'T WALK");
  assert.equal(second.answer, 'E', 'a lower-case letter still counts');
  assert.equal(scoreQuiz([first, second], ['B', 'E']).score, 2);
});

test('a CSV whose answer is not one of its options is refused, naming the line', () => {
  const csv = 'number,question,option_a,option_b,answer\n1,Q one,Yes,No,A\n2,Q two,Yes,No,C\n';
  assert.throws(() => quizFromCsv(csv), /Line 3: the answer "C" is not one of its options/);
  assert.throws(() => quizFromCsv('number,question,answer\n1,Q,A\n'), /needs question, option_a/);
});

test('the CSV round-trips through quizToCsv unchanged', () => {
  const questions = quizFromCsv(techQuiz1);
  assert.deepEqual(quizFromCsv(quizToCsv(questions)), questions);
  assert.equal(quizToCsv(questions), techQuiz1);
});

test('parseCsv keeps empty fields and drops blank lines', () => {
  assert.deepEqual(parseCsv('a,,c\n\n1,2,3\n'), [['a', '', 'c'], ['1', '2', '3']]);
});
