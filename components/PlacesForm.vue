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
const { userData } = await useUser();

const commodityData = COMMODITIES[props.commodity];
const factor = commodityData.factor;

/** @type {import('vue').ComputedRef<Array<import('~/utils/constants.js').HSCode>>} */
const hsHeadings = computed(() => {
  if (props.commodity === 'rind') {
    if (userData.value.cattleBreedingFarm === true) {
      return ['010221'];
    }
  }
  return commodityData.hsHeadings;
});

for (const hsCode of hsHeadings.value) {
  if (!quantity.value[hsCode]) {
    quantity.value[hsCode] = 0;
  }
}

watch(area, (value) => {
  if (factor) {
    quantity.value[hsHeadings.value[0]] = toPrecision(value * factor, 2);
  }
});

const specifyFarmType = ref(false);
if (props.commodity === 'rind') {
  const { userData } = await useUser();
  if (typeof userData.value?.cattleBreedingFarm !== 'boolean') {
    specifyFarmType.value = true;
  }
}

/**
 * @param {boolean} value
 */
async function closeSpecifyFarmType(value) {
  const { userData } = await useUser();
  userData.value.cattleBreedingFarm = value;
  specifyFarmType.value = false;
}
</script>

<template>
  <v-container fluid>
    <v-dialog v-model="specifyFarmType" max-width="400">
      <v-card>
        <v-card-text>Ist Ihr Betrieb ein reiner Zuchtbetrieb?</v-card-text>
        <v-card-actions>
          <v-btn @click="closeSpecifyFarmType(false)">Nein</v-btn>
          <v-btn @click="closeSpecifyFarmType(true)">Ja</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-form @submit.prevent="emit('submit')">
      <v-row align="center">
        <v-col v-for="hs in hsHeadings" :key="hs" :cols="mdAndUp ? 2 : xs ? 4 : 3">
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
