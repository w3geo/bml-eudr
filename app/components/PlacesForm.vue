<script setup>
const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~~/shared/utils/constants.js').Commodity>} */ (
      String
    ),
    required: true,
  },
});

const { mdAndUp, xs } = useDisplay();
const { geojson, quantity } = useStatement(props.commodity);

const area = computed(() => calculateAreaFromGeoJSON(geojson.value));

const commodityData = COMMODITIES[props.commodity];
const yieldPerHectare = ref(commodityData.yieldPerHectare);

for (const hsCode of commodityData.hsHeadings) {
  if (!quantity.value[hsCode]) {
    quantity.value[hsCode] = 0;
  }
}

watch(area, (value) => {
  if (yieldPerHectare.value && commodityData.hsHeadings.length) {
    for (const hsHeading of commodityData.hsHeadings) {
      if (quantity.value[hsHeading] === undefined) {
        continue;
      }
      quantity.value[hsHeading] = toPrecision(value * yieldPerHectare.value, 0);
    }
  }
});

watch(yieldPerHectare, (value) => {
  if (value && commodityData.hsHeadings.length) {
    commodityData.yieldPerHectare = value;
    for (const hsHeading of commodityData.hsHeadings) {
      if (quantity.value[hsHeading] === undefined) {
        continue;
      }
      quantity.value[hsHeading] = toPrecision(area.value * value, 0);
    }
  }
});
</script>

<template>
  <v-container fluid>
    <v-form>
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
        <v-col v-if="yieldPerHectare !== undefined" :cols="mdAndUp ? 2 : xs ? 4 : 3">
          <v-text-field
            v-model.number="yieldPerHectare"
            max-width="60"
            label="Ertrag/ha"
            :suffix="COMMODITIES[commodity]?.units"
            density="compact"
            variant="plain"
            type="number"
            hide-details
          ></v-text-field>
        </v-col>
        <v-col :cols="mdAndUp ? 2 : xs ? 4 : 3">
          <v-sheet>
            {{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              area.toLocaleString('de-AT')
            }}
            ha
          </v-sheet>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped></style>
