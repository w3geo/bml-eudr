<script setup>
import { mdiQrcode } from '@mdi/js';
import { renderSVG } from 'uqr';

const props = defineProps({
  payload: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: 'primary',
  },
});

const showCode = ref(false);
/** @type {import('vue').Ref<string|null>} */
const codeSVG = ref(null);

watch(showCode, (value) => {
  if (value) {
    codeSVG.value = 'data:image/svg+xml;base64,' + btoa(renderSVG(props.payload));
  }
});
</script>

<template>
  <v-btn :color="props.color" :prepend-icon="mdiQrcode" @click="showCode = true"> QR-Code </v-btn>
  <v-dialog v-model="showCode" max-width="300px">
    <v-card>
      <v-card-title class="headline">QR-Code</v-card-title>
      <v-card-text>
        <v-img v-if="codeSVG" :src="codeSVG" />
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="showCode = false">Schließen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
