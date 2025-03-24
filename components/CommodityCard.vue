<script setup>
import { mdiNoteEdit, mdiPlus } from '@mdi/js';

const props = defineProps({
  item: {
    type: /** @type {import('vue').PropType<import('~/pages/statement.vue').CommodityDataWithKey>} */ (
      Object
    ),
    required: true,
  },
});
const emit = defineEmits(['openEditor']);
</script>

<template>
  <v-card
    :color="props.item.summary ? 'teal-darken-4' : ''"
    class="d-flex flex-column align-center justify-center"
    min-height="180"
    @click="emit('openEditor', props.item.key)"
  >
    <v-card-title>{{ COMMODITIES[item.key].title }}</v-card-title>
    <v-card-text class="d-flex flex-column align-center justify-center pb-0"
      ><v-icon :icon="COMMODITIES[item.key].icon" size="50" />
      <div>{{ props.item.summary }}</div></v-card-text
    >
    <v-card-actions
      ><v-btn v-if="!props.item?.summary" color="primary" :prepend-icon="mdiPlus">Hinzufügen</v-btn
      ><v-btn v-else color="primary" :prepend-icon="mdiNoteEdit">Bearbeiten</v-btn></v-card-actions
    >
  </v-card>
</template>
