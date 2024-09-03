<template>
  <div>
    <h1>New Month Template</h1>

    <h2>Follow these steps for new Page Each Month</h2>
    <ul>
      <li>git branch MONTH-NAME</li>
      <li>
        create new view and components (TYPE: vbase (with plugin enabled) to
        setup template/script/style), add to router as import and object in
        index.js. Use this script and style below. Copy split calc for panels.
        Add Button on header bar.
      </li>
      <li>build, research, update</li>
      <li>
        git add ., git commit -m "new tool desc.", git push origin head -u
      </li>
    </ul>
  </div>
</template>

<script>
import ProcessGPX from "../components/ProcessGPX.vue";

export default {
  name: NewMonth,
  components: {
    InputBox,
  },

  data() {
    return {};
  },
  methods: {},
};
</script>
<style scoped></style>
