import { defineStore } from 'pinia';

export const useDataStore = defineStore('data', {
    state: () => ({
        count: 0
    }),
    actions: {
        increment() {
            console.log("trying to count", this.count)
            this.count++;
        }
    },
    persist: true, // Optionally, add persistence
});