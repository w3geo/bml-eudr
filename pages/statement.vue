<script setup>
import { mdiClose, mdiCow, mdiForestOutline, mdiPlus, mdiSprout } from '@mdi/js';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();
const products = {
  sojabohnen: {
    title: 'Sojabohnen',
    icon: mdiSprout,
  },
  Rind: {
    title: 'Rinder',
    icon: mdiCow,
  },
  reinrassigesZuchtrind: {
    title: 'Reinrassige Zuchtrinder',
    icon: mdiCow,
  },
  rohholz: {
    title: 'Rohholz',
    icon: mdiForestOutline,
  },
};

/** @type {import('vue').Ref<null|keyof products>} */
const editProduct = ref(null);

const map = computed({
  get: () => !!editProduct.value,
  set: (value) => {
    if (!value) {
      editProduct.value = null;
    }
  },
});

/** @type {import('vue').Ref<Array<*>>} */
const items = ref([]);
</script>

<template>
  <v-dialog v-model="map" fullscreen>
    <v-card>
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="map = false"></v-btn>

        <v-app-bar-title>{{ editProduct ? products[editProduct].title : '' }}</v-app-bar-title>

        <v-btn
          text="Übernehmen"
          variant="text"
          @click="
            map = false;
            items.push({});
          "
        ></v-btn>
      </v-toolbar>
      <statement-form :product="editProduct" />
      <agraratlas-map />
    </v-card>
  </v-dialog>
  <v-container>
    <v-row>
      <v-col v-for="(item, key) in products" :key="key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-title class="d-flex justify-center">{{ item.title }}</v-card-title>
          <v-card-text class="d-flex justify-center"
            ><v-icon :icon="item.icon" size="50"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiPlus" @click="editProduct = key"
              >Hinzufügen</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
      <v-col v-for="(item, index) in items" :key="index" :cols="mdAndUp ? 4 : xs ? 12 : 6">
        <v-card>
          <v-card-text class="d-flex justify-center"
            ><v-img src="/minimap.png" width="82" height="82"
          /></v-card-text>
          <v-card-actions class="d-flex justify-center"
            ><v-btn color="primary" :prepend-icon="mdiSprout" @click="editProduct = item"
              >Bearbeiten</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
