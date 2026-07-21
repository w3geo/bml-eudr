<script setup>
const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~~/shared/utils/constants.js').Commodity>} */ (
      String
    ),
    required: true,
  },
});

const { xs } = useDisplay();
const { geojson, quantity, address, geolocation } = useStatement(props.commodity);

const form = ref();

/**
 * Validate the visible fields (the postal address is required when "Postadresse"
 * is selected). Exposed so the editor's confirm action can block on it.
 * @returns {Promise<boolean>}
 */
async function validate() {
  const { valid } = await form.value.validate();
  return valid;
}

defineExpose({ validate });

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
  <v-container fluid :class="xs ? 'pa-2' : undefined">
    <v-form ref="form" validate-on="submit lazy">
      <v-row no-gutters>
        <v-col
          cols="12"
          lg="6"
          class="d-flex align-center flex-nowrap"
          :class="xs ? 'ga-2' : 'ga-4'"
        >
          <v-text-field
            v-for="hs in commodityData.hsHeadings"
            :key="hs"
            v-model.number="quantity[hs]"
            class="quantity-field"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            :label="HS_HEADING[hs]"
            :suffix="COMMODITIES[commodity]?.units"
          ></v-text-field>
          <v-text-field
            v-if="yieldPerHectare !== undefined"
            v-model.number="yieldPerHectare"
            class="yield-field"
            label="Ertrag/ha"
            :suffix="COMMODITIES[commodity]?.units"
            density="compact"
            variant="plain"
            type="number"
            hide-details
          ></v-text-field>
          <v-select
            v-model="geolocation"
            class="select-field"
            :items="[
              { title: 'Postadresse', value: false },
              { title: 'Geolokalisation', value: true },
            ]"
            label="Erzeugungsort"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-sheet v-if="geolocation" class="stats text-no-wrap text-caption">
            {{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              area.toLocaleString('de-AT')
            }}
            ha
          </v-sheet>
        </v-col>
      </v-row>
      <v-row v-if="!geolocation && address" no-gutters class="mt-8">
        <v-col cols="12" lg="6">
          <div class="text-subtitle-2 mb-4">Postadresse des Erzeugungsorts</div>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="address.street"
                label="Straße und Hausnummer (optional)"
                density="compact"
                variant="outlined"
                hide-details="auto"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model="address.postalCode"
                label="PLZ"
                density="compact"
                variant="outlined"
                hide-details="auto"
                :rules="[(v) => !!v || 'PLZ ist erforderlich']"
              ></v-text-field>
            </v-col>
            <v-col cols="8">
              <v-text-field
                v-model="address.city"
                label="Ort"
                density="compact"
                variant="outlined"
                hide-details="auto"
                :rules="[(v) => !!v || 'Ort ist erforderlich']"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped>
/* Quantity inputs share the leftover width evenly and are allowed to shrink
   below their intrinsic size (min-width: 0) so the row never wraps, but keep a
   floor wide enough to show their label. */
.quantity-field {
  flex: 1 1 0;
  min-width: 110px;
}

/* The select needs to stay readable, so give it more of the free space and a
   larger floor than the quantity fields. */
.select-field {
  flex: 2 1 0;
  min-width: 150px;
}

/* The yield field is auxiliary; keep it narrow and non-growing. */
.yield-field {
  flex: 0 0 auto;
  width: 80px;
}

/* Statistics keep their natural size; the flexible fields absorb the rest. */
.stats {
  flex: 0 0 auto;
}

/* On very small displays (e.g. iPhone SE, 375px) the combined floors above no
   longer fit, pushing the statistics off the row. Tighten every floor so the
   whole line — statistics included — still fits. */
@media (max-width: 480px) {
  .quantity-field {
    min-width: 64px;
  }

  .select-field {
    min-width: 96px;
  }

  .yield-field {
    width: 60px;
  }
}
</style>
