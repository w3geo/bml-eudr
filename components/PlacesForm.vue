<script setup>
import { ref } from 'vue';

const props = defineProps({
  product: {
    type: /** @type {import('vue').PropType<import('~/utils/constants.js').EditProduct>} */ (
      String
    ),
    required: true,
  },
});

/** @type {Object<string, {units: string, factor?: number}>} */
const unitsAndFactors = {
  sojabohnen: {
    units: 't',
    factor: 4,
  },
  rind: {
    units: 'Stk.',
  },
  reinrassigesZuchtrind: {
    units: 'Stk.',
  },
  rohholz: {
    units: 'm³',
    factor: 7.2,
  },
};

const { mdAndUp, xs } = useDisplay();
const { area, geojson } = useStatement(props.product);

const form = ref({
  area: 0,
  quantity: 0,
});

const factor = unitsAndFactors[props.product]?.factor;
watch(area, (value) => {
  form.value.area = value;
  if (factor) {
    form.value.quantity = toPrecision(value * 4, 4);
  }
});
</script>

<template>
  <v-container fluid>
    <v-form>
      <v-row align="center">
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-text-field
            v-model.number="form.quantity"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            label="Menge"
            :suffix="unitsAndFactors[product]?.units"
          ></v-text-field>
        </v-col>
        <v-col :cols="mdAndUp ? 2 : xs ? 6 : 3">
          <v-sheet
            >{{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              form.area
            }}
            ha</v-sheet
          >
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped></style>
