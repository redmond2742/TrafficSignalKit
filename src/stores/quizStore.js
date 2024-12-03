import { defineStore } from 'pinia';
import { quizData } from './data';

export const useQuizStore = defineStore('quizStore', {
  state: () => ({
    questions: [], // Load initial data from data.js
    currentQuestionIndex: 0,
    secretKey: "",
    userAnswers: [[],[]],

    score: 0,
    array_topic: '',
    topic_index: 0,
    totalQuizTime: 0,
    startTime: null, // To store the start time of the quiz
    endTime: null,   // To store the end time of the quiz
    totalTime: 0,    // Total time taken for the quiz in seconds
    averageTimePerQuestion: 0, // Average time per question in seconds
  }),
  actions: {
    loadQuiz(topic) {
        this.startTime = Date.now(); // Start the timer
        console.log(this.startTime)
        this.endTime = null;
        this.totalTime = 0;
        this.averageTimePerQuestion = 0;
    
        if(topic == "Home DIY"){
            this.array_topic = "homeDIY"
            this.topic_index = 0;
        } else if( topic == "Fun Quiz"){
            this.array_topic = "funQuiz",
            this.topic_index = 1;
        } else if (topic == "Traffic Signal Tech Quiz 1"){
            this.array_topic = "SignalTechQuiz1",
            this.topic_index = 2;
        }

        // Load the selected set of questions based on the dropdown value
        if (quizData[this.array_topic]) {
          this.questions = quizData[this.array_topic];
          this.curretQuestionIndex = 0;
          this.userAnswers[this.topic__index] = [];
          this.score = 0;
        }
       
      },
    nextQuestion() {
      let questionCount = this.currentQuestionIndex +1;

      if(this.topic_index == 2){

        this.llUserAnswers[questionCount] = this.userAnswers[this.currentQuestionIndex];

        console.log(this.llUserAnswers)


      }else{

    
      
      if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
        this.score++;
        console.log("Q"+questionCount+": You got correct, incrementing score")
      }
      else{
        console.log("Q"+questionCount+": you got wrong")
      }
      
    }
    this.currentQuestionIndex++;
    },

    next10Question() {
        let questionCount = this.currentQuestionIndex +1;

     
        if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
          this.score++;
          console.log("Q"+questionCount+": You got correct, incrementing score")
        }
        else{
          console.log("Q"+questionCount+": you got wrong")
        }
        
    
    this.currentQuestionIndex = questionCount +9;
      },

    prevQuestion() {
        let questionCount = this.currentQuestionIndex +1;

     
        
        if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
          this.score++;
          console.log("Q"+questionCount+": You got correct, incrementing score")
        }
        else{
          console.log("Q"+questionCount+": you got wrong")
        }
        
        
        this.currentQuestionIndex--;
      },

      prev10Question() {
        let questionCount = this.currentQuestionIndex +1;

        
        if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
          this.score++;
          console.log("Q"+questionCount+": You got correct, incrementing score")
        }
        else{
          console.log("Q"+questionCount+": you got wrong")
        }
        
        
        this.currentQuestionIndex = questionCount - 11;
      },


    endQuiz(topic) {
        let questionCount = this.currentQuestionIndex +1;
      
  
    
      if (this.userAnswers[this.currentQuestionIndex] === this.questions[this.currentQuestionIndex].correctAnswer) {
        this.score++;
        console.log("Q"+questionCount+": You got correct, incrementing score")
      }
      else{
        console.log("Q"+questionCount+": you got wrong")
      }
      this.currentQuestionIndex++;
 
        this.endTime = Date.now(); // End the timer
        this.totalTime = Math.floor((this.endTime - this.startTime) / 1000); // Calculate total time in seconds
        this.averageTimePerQuestion = this.totalTime / this.questions.length; // Calculate average time per question
        console.log("ending", this.endTime, this.totalTime)
      
    },



    restartQuiz() {
      this.currentQuestionIndex = 0;
      this.userAnswers = [];
      this.score = 0;
      console.log("restart quiz", this.score)
      this.startTime = Date.now(); // Restart the timer
      this.endTime = null;
      this.totalTime = 0;
      this.averageTimePerQuestion = 0;
      

    },
  },
  getters: {
    currentQuestion(state) {
      return state.questions[state.currentQuestionIndex] || {};
    },
  },
});
