<script setup>
const emit = defineEmits(['submit']);

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~/utils/constants.js').Commodity>} */ (String),
    required: true,
  },
});

const { mdAndUp, xs } = useDisplay();
const { area, geojson, quantity } = useStatement(props.commodity);

const commodityData = COMMODITIES[props.commodity];
const factor = commodityData.factor;

for (const hsCode of commodityData.hsHeadings) {
  if (!quantity.value[hsCode]) {
    quantity.value[hsCode] = 0;
  }
}

watch(area, (value) => {
  if (factor) {
    quantity.value[commodityData.hsHeadings[0]] = toPrecision(value * factor, 2);
  }
});
</script>

<template>
  <v-container fluid>
    <v-form @submit.prevent="emit('submit')">
      <v-row align="center">
        <v-col v-for="hs in commodityData.hsHeadings" :key="hs" :cols="mdAndUp ? 2 : xs ? 4 : 3">
          <v-text-field
            v-model.number="quantity[hs]"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            :label="HS_HEADING[hs]"
            :suffix="COMMODITIES[commodity]?.units"
          ></v-text-field>
        </v-col>
        <v-col :cols="mdAndUp ? 2 : xs ? 4 : 3">
          <v-sheet
            >{{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              area.toLocaleString('de-AT')
            }}
            ha</v-sheet
          >
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped></style>
