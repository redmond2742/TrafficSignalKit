<template>
  <div>
    <v-radio-group v-model="timezoneOffset" inline>
      <v-radio label="PST (GMT-8)" value="America/Los_Angeles"></v-radio>
      <v-radio label="MST (GMT-7)" value="America/Denver"></v-radio>
      <v-radio label="CST (GMT-6)" value="America/Chicago"></v-radio>
      <v-radio label="EST (GMT-5)" value="America/New_York"></v-radio>
    </v-radio-group>
  </div>
</template>
<script>
export default {
  data() {
    return {
      timezoneOffset: "America/Los_Angeles",
    };
  },
  created() {
    this.emitTimezone();
  },
  updated() {
    this.emitTimezone();
  },
  methods: {
    emitTimezone() {
      this.$emit("updateTimezone", this.timezoneOffset);
    },
  },
};
</script>
