<template>
  <div>
    <h2>Processed Data</h2>
    <ul>
      <li v-for="item in csvData" :key="item.timestamp">
        Timestamp: {{ item.timestamp }} | Enumeration: {{ item.enumeration }} |
        Channel: {{ item.channel }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    data: Array,
  },
};
</script>
