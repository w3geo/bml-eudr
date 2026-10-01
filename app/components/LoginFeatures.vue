<script setup>
import { mdiCheck, mdiClose, mdiPencilOutline } from '@mdi/js';

/** @typedef {'pro'|'effort'|'con'} FeatureType */

defineProps({
  features: {
    type: /** @type {import('vue').PropType<Array<{ text: string, type: FeatureType }>>} */ (Array),
    required: true,
  },
});

/** @type {Record<FeatureType, { icon: string, color: string|undefined }>} */
const icons = {
  pro: { icon: mdiCheck, color: 'primary' },
  effort: { icon: mdiPencilOutline, color: undefined },
  con: { icon: mdiClose, color: 'error' },
};
</script>

<template>
  <div class="d-flex flex-wrap justify-center ga-2">
    <v-chip
      v-for="feature in features"
      :key="feature.text"
      :prepend-icon="icons[feature.type].icon"
      :color="icons[feature.type].color"
      variant="outlined"
      size="small"
    >
      {{ feature.text }}
    </v-chip>
  </div>
</template>
