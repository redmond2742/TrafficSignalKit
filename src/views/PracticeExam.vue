<template>
  <div id="app">
    <h1>Multiple Choice Quiz</h1>

    <!-- Quiz Topic Selection -->
    <div class="form-group-select">
      <v-select
        label="Practice Questions"
        :items="['Trip Generation', 'Parking', 'Signal Timing']"
        variant="outlined"
        v-model="selectedTopic"
        @update:modelValue="loadQuiz"
      ></v-select>
    </div>
    <br />
    <br />

    <!-- Display Questions -->
    <div v-if="questions.length > 0 && currentQuestionIndex < questions.length">
      <h2>Question {{ currentQuestionIndex + 1 }} / {{ questions.length }}:</h2>
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

      <v-btn
        @click="nextQuestion"
        :disabled="!userAnswers[currentQuestionIndex]"
      >
        Next
      </v-btn>
    </div>

    <!-- Grade Display -->
    <div
      v-if="(currentQuestionIndex >= questions.length) & (selectedTopic != '')"
    >
      <h2>Quiz Completed!</h2>
      <p>
        Your score: {{ score }}/{{ questions.length }} ( {{ percentScore }}% )
      </p>
      <p></p>
      <v-btn @click="restartQuiz">Restart Quiz</v-btn>
    </div>
  </div>
</template>

<script>
import { useQuizStore } from "../stores/quizStore";
import { ref, computed } from "vue";

export default {
  setup() {
    const quizStore = useQuizStore();
    const selectedTopic = ref("");

    const loadQuiz = (topic) => {
      quizStore.loadQuiz(topic);
    };

    return {
      // State and actions from the store
      selectedTopic,
      questions: computed(() => quizStore.questions),
      currentQuestionIndex: computed(() => quizStore.currentQuestionIndex),
      currentQuestion: computed(() => quizStore.currentQuestion),
      userAnswers: ref(quizStore.userAnswers),
      score: computed(() => quizStore.score),
      nextQuestion: quizStore.nextQuestion,
      restartQuiz: quizStore.restartQuiz,
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
