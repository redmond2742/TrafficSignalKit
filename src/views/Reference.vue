<template>
  <v-container class="py-6">
    <v-row>
      <v-col>
        <h1 class="text-center">Reference</h1>
        <p class="text-center text-subtitle-1">
          Quick lookup tables for NTCIP 1202 status and alarm references.
        </p>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col>
        <h2>NTCIP 1202 Table 2.4.6 - Flash Status</h2>
        <v-table density="compact" class="mt-3">
          <thead>
            <tr>
              <th class="text-left">Value</th>
              <th class="text-left">Flash Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="status in flashStatus" :key="status.value">
              <td>{{ status.value }}</td>
              <td>{{ status.label }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col>
        <h2>NTCIP 1202 Table 2.4.8 - Coordination Status Bits</h2>
        <v-table density="compact" class="mt-3">
          <thead>
            <tr>
              <th class="text-left">Bit</th>
              <th class="text-left">Name</th>
              <th class="text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bit in coordinationBits" :key="bit.bit">
              <td>{{ bit.bit }}</td>
              <td>{{ bit.name }}</td>
              <td>{{ bit.description }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col>
        <h2>NTCIP 1202 Table 2.4.12.2 - Alarm Input Status</h2>
        <v-table density="compact" class="mt-3">
          <thead>
            <tr>
              <th class="text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                This table contains alarm input status in groups of eight inputs.
                The number of rows in this table is equal to the maxAlarmGroups
                object.
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "Reference",
  data() {
    return {
      flashStatus: [
        { value: "other(1)", label: "other" },
        { value: "notFlash(2)", label: "notFlash" },
        { value: "automatic(3)", label: "automatic" },
        { value: "localManual(4)", label: "localManual" },
        { value: "faultMonitor(5)", label: "faultMonitor" },
        { value: "mmu(6)", label: "mmu" },
        { value: "startup(7)", label: "startup" },
        { value: "preempt(8)", label: "preempt" },
      ],
      coordinationBits: [
        {
          bit: 7,
          name: "CoordActive",
          description:
            "When coordination is active and not preempted or overridden.",
        },
        {
          bit: 6,
          name: "Local Free",
          description:
            "When any of the Controller Unit inputs and/or programming cause it to not respond to coordination control.",
        },
        {
          bit: 5,
          name: "Local Flash",
          description:
            "When the Controller Unit Local Flash input becomes active, MMU Flash input is not active, and Flash is not commanded by the system.",
        },
        {
          bit: 4,
          name: "MMU Flash",
          description:
            "When the Controller Unit MMU Flash input remains active for a period of time exceeding the Start-Up Flash time.",
        },
        {
          bit: 3,
          name: "Cycle Fail",
          description:
            "When a local Controller Unit is operating in the non-coordinated mode, whether the result of a Cycle Fault or Free being the current normal mode, and cycling diagnostics indicate that a serviceable call exists that has not been serviced for two cycles.",
        },
        {
          bit: 2,
          name: "Coord Fail",
          description:
            "When a Coord Fault is in effect and a Cycle Fault occurs again within two cycles of the coordination retry.",
        },
        {
          bit: 1,
          name: "Coord Fault",
          description:
            "When a Cycle Fault is in effect and the serviceable call has been serviced within two cycles after the Cycle Fault.",
        },
        {
          bit: 0,
          name: "Cycle Fault",
          description:
            "When the Controller Unit is operating in the coordinated mode and cycling diagnostics indicate that a serviceable call exists that has not been serviced for two cycles.",
        },
      ],
    };
  },
};
</script>

<style scoped>
h1 {
  font-weight: 600;
}

h2 {
  font-weight: 600;
}
</style>
