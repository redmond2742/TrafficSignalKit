<template>
  <div>
    <h1 class="h1-center-text">GeoJSON Mapper</h1>
    <p class="left-justify-text">
      Upload one or multiple GeoJSON files, style each layer with custom colors and line thickness, or paste large GeoJSON text below the map. Then export the map as an image.
    </p>
    <ProcessGeoJSONMapper />
  </div>
</template>

<script>
import ProcessGeoJSONMapper from "@/components/ProcessGeoJSONMapper.vue";

export default {
  name: "GeoJSONMapper",
  components: {
    ProcessGeoJSONMapper,
  },
};
</script>
