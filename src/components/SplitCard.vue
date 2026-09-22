<template>
  <v-container>
    <v-btn variant="tonal" color="success" class="mb-4" @click="addCard">
      Add another intersection
    </v-btn>

    <v-row class="mb-6" justify="center" no-gutters>
      <v-col v-for="card in cards" :key="card.id" cols="12">
        <v-card elevation="3" class="mb-6">
          <v-card-title class="d-flex align-center ga-4 flex-wrap">
            <!--
              This used to be unbound, so whatever you typed as the intersection
              name was not attached to the card at all and vanished on re-render.
            -->
            <v-combobox
              v-model="card.label"
              class="flex-grow-1"
              clearable
              hide-details
              density="compact"
              :items="nameDescription"
              label="Intersection name / pattern"
            ></v-combobox>
            <v-btn
              v-if="cards.length > 1"
              variant="text"
              color="error"
              @click="removeCard(card.id)"
            >
              Remove
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <RingBarrier></RingBarrier>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "SplitCard",
  data() {
    return {
      nameDescription: [],
      nextId: 2,
      // ids rather than array indexes, so removing a card in the middle does
      // not make Vue reuse the wrong calculator's state
      cards: [{ id: 1, label: "" }],
    };
  },
  methods: {
    addCard() {
      this.cards.push({ id: this.nextId, label: "" });
      this.nextId += 1;
    },
    removeCard(id) {
      this.cards = this.cards.filter((card) => card.id !== id);
    },
  },
};
</script>
