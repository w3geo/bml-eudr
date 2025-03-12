<script setup>
import { mdiCheck, mdiClose, mdiPlus, mdiSprout } from '@mdi/js';

definePageMeta({
  middleware: ['authenticated-only'],
  title: 'Sorgfaltspflichterklärung',
  sort: 20,
});

const { mdAndUp, xs } = useDisplay();

/** @type {import('vue').Ref<null|import('~/utils/constants').EditProduct>} */
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

/** @type {import('vue').Ref<boolean>} */
const confirm = ref(false);

function save() {
  map.value = false;
  items.value.push({});
}

function confirmAbandon() {
  confirm.value = true;
}
</script>

<template>
  <v-dialog v-model="confirm" max-width="400">
    <v-card>
      <v-card-text>Änderungen werden nicht gespeichert. Möchten Sie fortfahren?</v-card-text>
      <v-card-actions>
        <v-btn @click="confirm = false">Nein</v-btn>
        <v-btn
          @click="
            confirm = false;
            map = false;
          "
          >Ja</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="map" fullscreen>
    <v-card v-if="editProduct">
      <v-toolbar>
        <v-btn :icon="mdiClose" @click="confirmAbandon"></v-btn>

        <v-app-bar-title>{{ PRODUCTS[editProduct].title }}</v-app-bar-title>

        <v-btn :icon="mdiCheck" @click="save"></v-btn>
      </v-toolbar>
      <places-form :product="editProduct" />
      <places-map :product="editProduct" />
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col v-for="(item, key) in PRODUCTS" :key="key" :cols="mdAndUp ? 4 : xs ? 12 : 6">
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
