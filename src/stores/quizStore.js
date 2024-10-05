import { defineStore } from 'pinia';
import { quizData } from './data';

export const useQuizStore = defineStore('quizStore', {
  state: () => ({
    questions: [], // Load initial data from data.js
    currentQuestionIndex: 0,
    userAnswers: [[],[]],
    score: 0,
    array_topic: '',
    topic_index: 0,
  }),
  actions: {
    loadQuiz(topic) {
        if(topic === "Trip Generation"){
            console.log("selected trip generation")
            this.array_topic = "tripGeneration";
            this.topic_index = 0;
        }else if(topic === "Parking"){
            console.log("selected parking")
            this.array_topic = "parking"
            this.topic_index = 1;
        }else if( topic === "Signal Timing"){
            console.log("selected signal timing")
            this.array_topic = "signalTiming"
            this.topic_index = 2;
        }

        // Load the selected set of questions based on the dropdown value
        if (quizData[this.array_topic]) {
          this.questions = quizData[this.array_topic];
          this.curretQuestionIndex = 0;
          this.userAnswers[this.topic__index] = [];
          this.score = 0;
        }
        console.log(this.userAnswers)
      },
    nextQuestion() {
        console.log(this.userAnswers)
      if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
        this.score++;
        console.log("question was correct, incrementing score", this.score)
      }
      this.currentQuestionIndex++;
    },
    restartQuiz() {
      this.currentQuestionIndex = 0;
      this.userAnswers = [];
      this.score = 0;
      console.log("restart quiz", this.score)
      

    },
  },
  getters: {
    currentQuestion(state) {
      return state.questions[state.currentQuestionIndex] || {};
    },
  },
});
