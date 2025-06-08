<template>
  <div class="d-flex align-center flex-column">
    <v-card width="100%" min-width="100">
      <v-card-title>
        <v-combobox
          clearable
          v-model="phaseLabel"
          :items="phases"
          density="compact"
          label="Phase"
        ></v-combobox>
      </v-card-title>
      <v-card-subtitle>
        <v-radio-group
          v-model="radioDirection"
          @change="onDirectionChange($event)"
          inline
        >
          <v-radio label="NB" value="NB"></v-radio>
          <v-radio label="SB" value="SB"></v-radio>
          <v-radio label="EB" value="EB"></v-radio>
          <v-radio label="WB" value="WB"></v-radio>
        </v-radio-group>
        <v-radio-group v-model="radioMovement" inline>
          <v-radio label="Through" value="T"></v-radio>
          <v-radio label="Left" value="L"></v-radio>
        </v-radio-group>
      </v-card-subtitle>

      <v-row align="center" justify="center">
        <v-responsive max-width="40" min-width="36">
          <h2>
            <p id="counter">{{ propSplitCount }}</p>
          </h2>
        </v-responsive>
        <v-col cols="auto">
          <v-col cols="auto" class="pa-1">
            <v-btn
              id="increase"
              density="compact"
              icon="mdi-plus"
              @click="increaseSplit"
            >
            </v-btn>
          </v-col>

          <v-col cols="auto" class="pa-1">
            <v-btn
              id="decrement"
              density="compact"
              icon="mdi-minus"
              @click="decreaseSplit"
            >
            </v-btn>
          </v-col>
        </v-col>
        <v-col cols="auto">
          <img
            v-if="radioMovement === 'T'"
            src="../assets/Arrow-Up.png"
            :style="imageStyle"
            class="rotated-image"
            alt="Through movement arrow"
          />
          <img
            v-else-if="radioMovement === 'L'"
            src="../assets/Arrow-Left.png"
            :style="imageStyle"
            class="rotated-image"
            alt="Left turn arrow"
          />
          <img
            v-else
            src="../assets/Arrow-Up.png"
            :style="imageStyle"
            class="rotated-image"
            alt="Default arrow"
          />
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script>
export default {
  props: {
    propSplitCount: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      splitCount: this.propSplitCount,
      phases: ["Ph1", "Ph2", "Ph3", "Ph4", "Ph5", "Ph6", "Ph7", "Ph8"],
      phaseLabel: "",
      direct: ["NB", "SB", "EB", "WB"],
      movement: ["Through", "Left", "Right"],
      rotationAngle: 0,
      radioDirection: "NB",
      radioMovement: "T",

      dirAngle: [
        { direction: "NB", angle: 0 },
        { direction: "SB", angle: 180 },
        { direction: "EB", age: 90 },
        { direction: "WB", age: 270 },
      ],
    };
  },
  componentUpdated() {
    this.logPhasingFormat();
  },
  methods: {
    increaseSplit() {
      this.splitCount = this.propSplitCount;
      this.splitCount++;
      this.$emit("changedCL", this.splitCount);
    },
    decreaseSplit() {
      this.splitCount = this.propSplitCount;
      if (this.splitCount <= 0) {
        this.splitCount = 0;
        this.$emit("changedCL", this.splitCount);
      } else {
        this.splitCount--;
        this.$emit("changedCL", this.splitCount);
      }
    },

    rotateImage(dir) {
      var angle = 0;
      console.log("Direction:" + dir);
      if (dir == "NB") {
        angle = 0;
        console.log("changing to nb");
      } else if (dir == "SB") {
        angle = 180;
        console.log("changing to sb");
      } else if (dir == "EB") {
        angle = 90;
        console.log("changing to eb");
      } else if (dir == "WB") {
        angle = 270;
        console.log("changing to wb");
      }
      console.log(angle);
      this.rotationAngle = angle;

      transform: `rotate(${angle}deg)`;
    },
    onDirectionChange(event) {
      this.radioDirection = event.target.value;
      console.log(this.radioDirection);
      this.rotateImage(this.radioDirection);
    },
    // ph(movement)angle --- 4(T)NB
    logPhasingFormat() {
      console.log(
        this.phaseLabel + "(" + this.radioMovement + ")" + this.radioDirection
      );
    },
  },
  computed: {
    imageStyle() {
      return {
        transform: `rotate(${this.rotationAngle}deg)`,
      };
    },
  },
};
</script>

<style>
.rotated-image {
  transition: transform 0.5s ease;
}
</style>
