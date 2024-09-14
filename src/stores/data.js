import { defineStore } from 'pinia';

export const useDataStore = defineStore('data', {
    state: () => ({
        count: 0,
        detChannel: 1 // Default value
    }),
    actions: {
        increment() {
            console.log("trying to count", this.count)
            this.count++;
        },
        checkMinValue() {
            console.log("trying to count", this.detChannel)
            if (this.detChannel < 1) {
              this.detChannel = 1;
            }
        },
        updateDetChannel(val) {
            if (val < 1) {
                this.detChannel = 1;
              } else {
                this.detChannel = val;
              }
        
        },
    },
    //persist: true, // Optionally, add persistence
});