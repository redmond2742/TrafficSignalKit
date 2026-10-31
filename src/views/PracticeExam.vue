<template>
  <div id="app">
    <h1>Multiple Choice Quiz</h1>

    <!-- Quiz Topic Selection -->
    <div class="form-group-select">
      <v-select
        label="Topic Selection for Practice Quiz"
        :items="topics"
        variant="outlined"
        v-model="selectedTopic"
        @update:modelValue="loadQuiz"
      ></v-select>
    </div>

    <template v-if="questions.length && !finished">
      <!-- Countdown Timer Display; keyed so a new quiz starts a new clock -->
      <Timer :key="startTime" :initialTime="questions.length * 60 * 4" />

      <h2>
        Question {{ currentQuestionIndex + 1 }} / {{ questions.length }} ({{
          percentComplete.toFixed(0)
        }}%):
      </h2>
      <div class="quiz-question">
        <p class="quiz-question__text">{{ currentQuestion.question }}</p>

        <!--
          One group for the question, valued by option key. Each option used
          to sit in a group of its own, valued by its text, which is what made
          Traffic Signal Tech Quiz 1 (answers stored as letters) unscoreable.
        -->
        <v-radio-group
          :model-value="answers[currentQuestionIndex] ?? null"
          :aria-label="currentQuestion.question"
          @update:model-value="answer"
        >
          <v-radio
            v-for="option in currentQuestion.options"
            :key="option.key"
            :label="`${option.key}. ${option.text}`"
            :value="option.key"
          />
        </v-radio-group>
      </div>

      <div class="quiz-nav">
        <v-btn @click="prev10Question" :disabled="currentQuestionIndex < 10">
          &laquo; 10
        </v-btn>
        <v-btn @click="prevQuestion" :disabled="currentQuestionIndex === 0">
          Back
        </v-btn>
        <v-btn v-if="!onLastQuestion" color="primary" @click="nextQuestion">
          Next
        </v-btn>
        <v-btn v-else color="primary" @click="endQuiz">Finish</v-btn>
        <v-btn
          @click="next10Question"
          :disabled="currentQuestionIndex > questions.length - 11"
        >
          10 &raquo;
        </v-btn>
      </div>
      <p class="quiz-answered">
        {{ answeredCount }} of {{ questions.length }} answered
      </p>
    </template>

    <!-- Grade Display -->
    <div v-if="finished" class="quiz-results">
      <h2>Quiz Completed!</h2>
      <p>
        Your score: {{ result.score }}/{{ result.total }} (
        {{ result.percent.toFixed(2) }}% )
      </p>
      <p>Total time taken: {{ totalTime }} seconds</p>
      <p>Average time per question: {{ averageTimePerQuestion }} seconds</p>
      <v-btn color="primary" @click="restartQuiz">Restart Quiz</v-btn>

      <!-- Every question, so a score can be checked against the key. -->
      <ol class="quiz-review">
        <li
          v-for="row in review"
          :key="row.index"
          :class="row.correct ? 'is-right' : 'is-wrong'"
        >
          <p class="quiz-review__question">
            <strong>{{ row.correct ? "Right" : "Wrong" }}:</strong>
            {{ row.question }}
          </p>
          <p v-if="!row.correct" class="quiz-review__line">
            Your answer: {{ row.chosenText || "none" }}
          </p>
          <p class="quiz-review__line">Correct answer: {{ row.answerText }}</p>
        </li>
      </ol>
    </div>
  </div>
</template>

<script>
import { computed, ref } from "vue";
import { useQuizStore, QUIZ_TOPICS } from "../stores/quizStore";
import Timer from "../components/foundational/Timer.vue";

export default {
  components: {
    Timer,
  },
  setup() {
    const quizStore = useQuizStore();
    // a quiz left open from an earlier visit comes back where it was
    const selectedTopic = ref(quizStore.topic || "");

    const optionText = (question, key) => {
      const option = question.options.find((o) => o.key === key);
      return option ? `${option.key}. ${option.text}` : "";
    };

    return {
      topics: QUIZ_TOPICS,
      selectedTopic,
      questions: computed(() => quizStore.questions),
      currentQuestionIndex: computed(() => quizStore.currentQuestionIndex),
      currentQuestion: computed(() => quizStore.currentQuestion),
      answers: computed(() => quizStore.answers),
      finished: computed(() => quizStore.finished),
      startTime: computed(() => quizStore.startTime),
      totalTime: computed(() => quizStore.totalTime),
      averageTimePerQuestion: computed(() => quizStore.averageTimePerQuestion),
      result: computed(() => quizStore.result),
      onLastQuestion: computed(
        () => quizStore.currentQuestionIndex === quizStore.questions.length - 1
      ),
      percentComplete: computed(
        () => (quizStore.currentQuestionIndex / quizStore.questions.length) * 100
      ),
      answeredCount: computed(
        () => quizStore.answers.filter((key) => key != null).length
      ),
      review: computed(() =>
        quizStore.result.results.map((row) => {
          const question = quizStore.questions[row.index];
          return {
            ...row,
            question: question.question,
            chosenText: optionText(question, row.chosen),
            answerText: optionText(question, row.answer),
          };
        })
      ),
      loadQuiz: (topic) => quizStore.loadQuiz(topic),
      answer: (key) => quizStore.answer(key),
      nextQuestion: () => quizStore.nextQuestion(),
      prevQuestion: () => quizStore.prevQuestion(),
      next10Question: () => quizStore.next10Question(),
      prev10Question: () => quizStore.prev10Question(),
      endQuiz: () => quizStore.endQuiz(),
      restartQuiz: () => quizStore.restartQuiz(),
    };
  },
};
</script>

<style scoped>
#app {
  text-align: center;
  margin-top: 50px;
}

.form-group-select {
  max-width: 560px;
  margin: 0 auto 24px;
}

.quiz-question {
  max-width: 640px;
  margin: 0 auto;
  text-align: left;
}
.quiz-question__text {
  font-size: 1.05rem;
  margin-bottom: 4px;
}

.quiz-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.quiz-answered {
  text-align: center;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.quiz-results p {
  text-align: center;
}
.quiz-review {
  max-width: 640px;
  margin: 24px auto 0;
  padding-left: 1.5em;
  text-align: left;
}
.quiz-review li {
  margin-bottom: 12px;
  padding-left: 4px;
}
.quiz-review li.is-wrong {
  color: rgb(var(--v-theme-error));
}
.quiz-review .quiz-review__question,
.quiz-review .quiz-review__line {
  text-align: left;
  margin: 0;
}
.quiz-review__line {
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
