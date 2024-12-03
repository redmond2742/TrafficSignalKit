<template>
  <div id="app">
    <h1>Multiple Choice Quiz</h1>

    <!-- Quiz Topic Selection -->
    <div class="form-group-select">
      <v-select
        label="Topic Selection for Practice Quiz"
        :items="['Fun Quiz', 'Home DIY', 'Traffic Signal Tech Quiz 1']"
        variant="outlined"
        v-model="selectedTopic"
        @update:modelValue="loadQuiz"
      ></v-select>
    </div>
    <br />
    <br />

    <!-- Countdown Timer Display -->
    <div v-if="questions.length > 0 && currentQuestionIndex < questions.length">
      <Timer :initialTime="questions.length * 60 * 4" />
    </div>

    <!-- Display Questions -->
    <div v-if="questions.length > 0 && currentQuestionIndex < questions.length">
      <h2>
        Question {{ currentQuestionIndex + 1 }} / {{ questions.length }} ({{
          percentComplete.toFixed(0)
        }}%):
      </h2>
      <p>{{ currentQuestion.question }}</p>

      <div v-for="(option, index) in currentQuestion.options" :key="index">
        <label>
          <v-container fluid>
            <v-radio-group v-model="userAnswers[currentQuestionIndex]">
              <v-radio
                :label="option"
                :name="'question' + currentQuestionIndex"
                :value="option"
              />
            </v-radio-group>
          </v-container>
        </label>
      </div>

      <v-btn @click="prev10QuestionBtn" :disabled="currentQuestionIndex < 10">
        <<10
      </v-btn>

      <v-btn @click="prevQuestionBtn" :disabled="currentQuestionIndex === 0">
        Back
      </v-btn>

      <v-btn @click="nextQuestionBtn"> Next </v-btn>
      <v-btn
        @click="next10QuestionBtn"
        :disabled="currentQuestionIndex > questions.length - 11"
      >
        10>>
      </v-btn>
    </div>

    <!-- Grade Display -->
    <div
      v-if="(currentQuestionIndex >= questions.length) & (selectedTopic != '')"
    >
      <h2>Quiz Completed!</h2>
      <p>
        Your score: {{ score }}/{{ questions.length }} (
        {{ percentScore.toFixed(2) }}% )
      </p>
      <p>Total time taken: {{ totalTime }} seconds</p>
      <p>
        Average time per question:
        {{ averageTimePerQuestion }} seconds
      </p>
      <p></p>
      <v-btn @click="restartQuiz">Restart Quiz</v-btn>
    </div>
  </div>
</template>

<script>
import { useQuizStore } from "../stores/quizStore";

import { ref, computed } from "vue";

import Timer from "../components/foundational/Timer.vue";

export default {
  components: {
    Timer,
  },
  setup() {
    const quizStore = useQuizStore();
    const selectedTopic = ref("");
    const remainingTime = ref(new Date());
    const totalQuizTime = 0;
    let timer = null;

    const loadQuiz = (topic) => {
      /*
      if (topic === "practice Questions") {
        const password = prompt(
          "Please enter the password to access Practice 1:"
        );
        if (password === quizStore.secretKey) {
          // Proceed to load the quiz for Practice 1
          console.log("Access granted. Loading Practice 1...");
          quizStore.loadQuiz(topic);
        } else {
          alert("Incorrect password. Access denied.");
          // Optionally reset the selected topic
          this.selectedTopic = null;
        }
      } else {
        // Load other quizzes normally
        
      }
      */
      quizStore.loadQuiz(topic);
    };

    // Method to move to the next question or end the quiz
    const nextQuestionBtn = () => {
      if (quizStore.currentQuestionIndex < quizStore.questions.length - 1) {
        quizStore.nextQuestion();
      } else {
        quizStore.endQuiz(); // End the quiz and stop the timer
        console.log(quizStore.currentQuestionIndex, quizStore.questions.length);
      }
    };

    const prev10QuestionBtn = () => {
      quizStore.prev10Question();
    };

    const prevQuestionBtn = () => {
      quizStore.prevQuestion();

      console.log(quizStore.currentQuestionIndex, quizStore.questions.length);
    };

    const next10QuestionBtn = () => {
      quizStore.next10Question();
    };

    return {
      // State and actions from the store
      selectedTopic,

      totalQuizTime: computed(() => quizStore.questions.length * 4 * 60),
      questions: computed(() => quizStore.questions),
      currentQuestionIndex: computed(() => quizStore.currentQuestionIndex),
      currentQuestion: computed(() => quizStore.currentQuestion),
      userAnswers: ref(quizStore.userAnswers),
      score: computed(() => quizStore.score),
      totalTime: computed(() => quizStore.totalTime),
      secretKey: computed(() => quizStore.secretKey),
      percentComplete: computed(
        () =>
          (quizStore.currentQuestionIndex / quizStore.questions.length) * 100
      ),
      averageTimePerQuestion: computed(() => quizStore.averageTimePerQuestion),
      nextQuestionBtn,
      next10QuestionBtn,
      prevQuestionBtn,
      prev10QuestionBtn,
      nextQuestion: quizStore.nextQuestion,
      restartQuiz: quizStore.restartQuiz,
      endQuiz: quizStore.endQuiz,
      percentScore: computed(
        () => (quizStore.score / quizStore.questions.length) * 100.0
      ),
      loadQuiz,
    };
  },
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 50px;
}

button {
  margin-top: 20px;
}
</style>
