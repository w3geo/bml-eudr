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
  rindReinrassigeZuchttiere: {
    title: 'Rind (reinrassige Zuchttiere)',
    icon: mdiCow,
  },
  rindAndere: {
    title: 'Rind (andere)',
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

const items = ref([]);
</script>

<template>
  <v-dialog fullscreen v-model="map">
    <v-card>
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="map = false"></v-btn>

        <v-toolbar-title>{{ editProduct ? products[editProduct].title : '' }}</v-toolbar-title>

        <v-spacer></v-spacer>

        <v-toolbar-items>
          <v-btn
            text="Übernehmen"
            variant="text"
            @click="
              map = false;
              items.push({});
            "
          ></v-btn>
        </v-toolbar-items>
      </v-toolbar>
      <agraratlas-map></agraratlas-map>
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
            ><v-btn color="primary" @click="editProduct = key" :prepend-icon="mdiPlus"
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
            ><v-btn color="primary" @click="editProduct = item" :prepend-icon="mdiSprout"
              >Bearbeiten</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
