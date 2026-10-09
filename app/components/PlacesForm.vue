<script setup>
import { mdiEyeOutline, mdiHelpCircleOutline } from '@mdi/js';

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~~/shared/utils/constants.js').Commodity>} */ (
      String
    ),
    required: true,
  },
  isAma: Boolean,
});

const { xs } = useDisplay();
const { geojson, quantity, address, geolocation } = useStatement(props.commodity, props.isAma);

/** Soja and cattle producers with an AMA login register their fields via MFA, so
 * they get the "confirm all fields are in AMA/MFA" checkbox and the map preview
 * button. */
const isAmaFields = computed(
  () => props.isAma && (props.commodity === 'sojabohnen' || props.commodity === 'rind'),
);
/** For cattle, the map preview only shows the fields of the main farm. */
const isAmaRind = computed(() => props.isAma && props.commodity === 'rind');

const form = ref();
const mfaConfirmed = ref(false);
const showFieldsMap = ref(false);
/** Set on validation when no quantity was entered; cleared as soon as one changes. */
const quantityMissing = ref(false);

watch(quantity, () => (quantityMissing.value = false), { deep: true });

/**
 * Validate the visible fields (at least one quantity, and the postal address when
 * "Postanschrift" is selected). Exposed so the editor's confirm action can block on it.
 * @returns {Promise<boolean>}
 */
async function validate() {
  quantityMissing.value = !Object.values(quantity.value).some((v) => v > 0);
  const { valid } = await form.value.validate();
  return valid && !quantityMissing.value;
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
          <template v-for="hs in commodityData.hsHeadings" :key="hs">
            <v-text-field
              v-model.number="quantity[hs]"
              class="quantity-field"
              density="compact"
              variant="outlined"
              hide-details
              :error="quantityMissing"
              type="number"
              :label="HS_HEADING[hs]"
              :suffix="COMMODITIES[commodity]?.units"
            ></v-text-field>
            <v-tooltip
              v-if="commodityData.hints?.[hs]"
              max-width="300"
              open-on-click
              location="top"
              pa-0
            >
              <template #activator="{ props: activatorProps }">
                <v-btn
                  class="flex-grow-0 flex-shrink-0"
                  :class="xs ? 'ms-n1' : 'ms-n3'"
                  flat
                  :icon="mdiHelpCircleOutline"
                  size="x-small"
                  density="comfortable"
                  v-bind="activatorProps"
                ></v-btn>
              </template>
              <div>{{ commodityData.hints[hs] }}</div>
            </v-tooltip>
          </template>
          <v-select
            v-model="geolocation"
            class="select-field"
            :items="[
              { title: 'Postanschrift', value: false },
              { title: 'Geolokalisation', value: true },
            ]"
            label="Lokalisierung"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-text-field
            v-if="geolocation && yieldPerHectare !== undefined"
            v-model.number="yieldPerHectare"
            class="yield-field"
            label="Ertrag/ha"
            :suffix="COMMODITIES[commodity]?.units"
            density="compact"
            variant="plain"
            type="number"
            hide-details
          ></v-text-field>
          <v-sheet v-if="geolocation" class="stats text-no-wrap text-caption">
            {{ geojson.features.length }} Ort{{ geojson.features.length === 1 ? '' : 'e' }}<br />{{
              area.toLocaleString('de-AT')
            }}
            ha
          </v-sheet>
        </v-col>
      </v-row>
      <!-- One message for all quantity fields (Holz has two), rather than one per field. -->
      <div v-if="quantityMissing" class="text-error text-caption mt-1 px-4">
        Zumindest für ein(en) Rohstoff/Erzeugnis muss eine Menge angegeben werden.
      </div>
      <v-row v-if="!geolocation && address" no-gutters class="mt-8">
        <v-col cols="12" lg="6">
          <v-checkbox
            v-if="isAmaFields"
            v-model="mfaConfirmed"
            density="compact"
            hide-details="auto"
            class="mb-4"
            :rules="[(v) => !!v || 'Bitte bestätigen Sie diese Angabe']"
          >
            <template #label>
              <div class="ml-1 text-body-2">
                Sämtliche meiner Flächen sind im System der AMA mittels MFA hinterlegt.
              </div>
              <v-tooltip max-width="400" open-on-click>
                <template #activator="{ props: activatorProps }">
                  <v-btn
                    flat
                    :icon="mdiHelpCircleOutline"
                    size="x-small"
                    v-bind="activatorProps"
                  ></v-btn>
                </template>
                <div>
                  Wenn nicht alle Flächen gewünscht sind, bitte über Geolokalisation die korrekten
                  Flächen wählen.
                </div>
              </v-tooltip>
            </template>
          </v-checkbox>
          <div v-if="isAmaFields" class="d-flex align-center mb-6">
            <v-btn variant="outlined" :prepend-icon="mdiEyeOutline" @click="showFieldsMap = true">
              Flächen anzeigen
            </v-btn>
            <v-tooltip v-if="isAmaRind" max-width="400" open-on-click>
              <template #activator="{ props: activatorProps }">
                <v-btn
                  flat
                  :icon="mdiHelpCircleOutline"
                  size="x-small"
                  v-bind="activatorProps"
                ></v-btn>
              </template>
              <div>Es werden nur die Flächen des Hauptbetriebs angezeigt.</div>
            </v-tooltip>
          </div>
          <div class="text-subtitle-2 mb-4">Postanschrift</div>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="address.street"
                label="Straße und Hausnummer"
                density="compact"
                variant="outlined"
                hide-details="auto"
                :rules="[(v) => !!v?.trim() || 'Straße und Hausnummer ist erforderlich']"
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

  <geolocations-dialog v-model="showFieldsMap" :commodity="props.commodity" />
</template>

<style scoped>
/* Quantity inputs keep a comfortable width instead of growing to fill the
   row, and are allowed to shrink below their intrinsic size so the row never
   wraps, but keep a floor wide enough to show their label. */
.quantity-field {
  flex: 0 1 140px;
  min-width: 110px;
}

/* The select doesn't need to grow with the row; keep it at a comfortable
   reading width so it doesn't consume the entire remaining space on large
   screens, while still able to shrink on narrow ones. */
.select-field {
  flex: 0 1 220px;
  min-width: 150px;
}

/* The yield field is auxiliary; keep it narrow and non-growing. */
.yield-field {
  flex: 0 0 auto;
  width: 60px;
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
    min-width: 56px;
  }

  .select-field {
    min-width: 88px;
  }

  .yield-field {
    width: 56px;
  }
}
</style>
