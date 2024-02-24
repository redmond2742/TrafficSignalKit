<template>
  <v-container class="grey lighten-5">
    <v-btn variant="tonal" color="success" @click="addCard">
      New Split Calculator
    </v-btn>

    <v-row class="mb-6" justify="center" no-gutters>
      <v-col sm="2"> </v-col>

      <div v-for="(card, index) in cards" :key="index">
        <v-card elevation="23">
          <v-sheet class="d-flex justify-end">
            <v-sheet class="ma-2 pa-2">
              <v-card-actions>
                <v-btn variant="tonal" color="error" @click="removeCard(index)">
                  Remove Split Window
                </v-btn>
              </v-card-actions>
            </v-sheet>
          </v-sheet>
          <v-card-title>
            <v-combobox
              clearable
              :items="nameDescription"
              label="Intersection Name  Description"
            ></v-combobox>
          </v-card-title>
          <hr />
          <br />

          <RingBarrier></RingBarrier>
        </v-card>
      </div>

      <v-col sm="2"> </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "app",
  data() {
    return {
      nameDescription: [""],
      cards: [
        {
          label: "",
          cycleTime: 120,
        },
      ],
    };
  },
  methods: {
    addCard() {
      console.log("adding new card");
      this.cards.push({
        label: "test 1",
        cycleLength: 120,
      });
    },
    removeCard(idx) {
      console.log("removing card w/ index: " + idx);
      this.cards.splice(idx, 1);
    },
  },
};
</script>

<style></style>
