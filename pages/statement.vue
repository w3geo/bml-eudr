<script setup>
import { mdiCow, mdiForestOutline, mdiPlus, mdiSprout } from '@mdi/js';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();
</script>

<template>
  <v-container>
    <v-row>
      <v-col :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">Sojabohnen</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="mdiSprout" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
      <v-col :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">Rind (reinrassige Zuchttiere)</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="mdiCow" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
      <v-col :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">Rind (andere)</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="mdiCow" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
      <v-col :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">Rohholz </v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="mdiForestOutline" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
