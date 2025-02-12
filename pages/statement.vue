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
          <v-card-title class="d-flex justify-center">Soja</v-card-title>
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
          <v-card-title class="d-flex justify-center">Rind</v-card-title>
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
          <v-card-title class="d-flex justify-center">Wald</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="mdiForestOutline" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn></v-card-actions
          >
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card style="height: 500px; width: 100%">
          <v-layout class="fill-height">
            <v-app-bar flat density="compact" title="Sorgfaltspflichterklärung"></v-app-bar>
            <v-main>
              <agraratlas-map class="fill-height" />
            </v-main>
          </v-layout>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
