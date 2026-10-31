import { defineStore } from 'pinia';
import { quizData } from './data';
import { normalizeQuestion, quizFromCsv, scoreQuiz } from '../utils/quiz.js';
import signalTechQuiz1Csv from '../data/quizzes/signal-tech-quiz-1.csv?raw';

/**
 * The quizzes, by the name in the topic picker. Each gives its questions in
 * the shape utils/quiz.js describes; Traffic Signal Tech Quiz 1 is read from
 * its CSV, so updating that file is all it takes to change the quiz.
 */
const QUIZZES = {
  'Fun Quiz': () => quizData.funQuiz.map(normalizeQuestion),
  'Home DIY': () => quizData.homeDIY.map(normalizeQuestion),
  'Traffic Signal Tech Quiz 1': () => quizFromCsv(signalTechQuiz1Csv),
};

export const QUIZ_TOPICS = Object.keys(QUIZZES);

export const useQuizStore = defineStore('quizStore', {
  state: () => ({
    topic: '',
    questions: [],
    currentQuestionIndex: 0,
    // the option key chosen for each question, by index
    answers: [],
    finished: false,
    startTime: null,
    endTime: null,
    totalTime: 0, // seconds
    averageTimePerQuestion: 0, // seconds
  }),
  getters: {
    currentQuestion(state) {
      return state.questions[state.currentQuestionIndex] || {};
    },
    /**
     * Worked out from the whole answer sheet. It used to be added to on every
     * Next, Back, 10>> and <<10, so revisiting a question scored it again.
     */
    result(state) {
      return scoreQuiz(state.questions, state.answers);
    },
  },
  actions: {
    loadQuiz(topic) {
      const source = QUIZZES[topic];
      this.topic = topic || '';
      this.questions = source ? source() : [];
      this.restartQuiz();
    },
    answer(key) {
      this.answers[this.currentQuestionIndex] = key;
    },
    goTo(index) {
      const last = this.questions.length - 1;
      this.currentQuestionIndex = Math.min(Math.max(index, 0), Math.max(last, 0));
    },
    nextQuestion() {
      this.goTo(this.currentQuestionIndex + 1);
    },
    prevQuestion() {
      this.goTo(this.currentQuestionIndex - 1);
    },
    next10Question() {
      this.goTo(this.currentQuestionIndex + 10);
    },
    prev10Question() {
      this.goTo(this.currentQuestionIndex - 10);
    },
    endQuiz() {
      this.finished = true;
      this.endTime = Date.now();
      this.totalTime = Math.floor((this.endTime - this.startTime) / 1000);
      this.averageTimePerQuestion = this.questions.length
        ? Number((this.totalTime / this.questions.length).toFixed(1))
        : 0;
    },
    restartQuiz() {
      this.currentQuestionIndex = 0;
      this.answers = [];
      this.finished = false;
      this.startTime = Date.now();
      this.endTime = null;
      this.totalTime = 0;
      this.averageTimePerQuestion = 0;
    },
  },
});
