<script setup>
const emit = defineEmits(['submit']);

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~/utils/constants.js').EditCommodity>} */ (
      String
    ),
    required: true,
  },
});

const { mdAndUp, xs } = useDisplay();
const { area, geojson, quantity } = useStatement(props.commodity);

const factor = COMMODITIES[props.commodity]?.factor;
watch(area, (value) => {
  if (factor) {
    quantity.value = toPrecision(value * 4, 4);
  }
});
</script>

<template>
  <v-container fluid>
    <v-form @submit.prevent="emit('submit')">
      <v-row align="center">
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-text-field
            v-model.number="quantity"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            label="Menge"
            :suffix="COMMODITIES[commodity]?.units"
          ></v-text-field>
        </v-col>
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-sheet
            >{{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              area
            }}
            ha</v-sheet
          >
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped></style>
