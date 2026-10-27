<script setup>
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map.js';
import 'ol/ol.css';
import VectorSource from 'ol/source/Vector.js';
import { View } from 'ol';
import { fromLonLat, transformExtent } from 'ol/proj';
import { mdiClose, mdiPencilOutline } from '@mdi/js';

/** Fallback extent (Austria) used when there is no geolocation to fit to. */
const austriaExtent = [...fromLonLat([9.530952, 46.372276]), ...fromLonLat([17.160776, 49.020608])];

const props = defineProps({
  geojson: {
    type: /** @type {import('vue').PropType<import('geojson').FeatureCollection<import('geojson').Geometry|null>>} */ (
      Object
    ),
    default: null,
  },
  /**
   * Fallback extent (`[minX, minY, maxX, maxY]` in EPSG:4326) used to fit the
   * map when `geojson` has no features, e.g. a precomputed bounding box for
   * a set of fields. Ignored once `geojson` provides an extent of its own.
   */
  extent: {
    type: /** @type {import('vue').PropType<[number, number, number, number]>} */ (
      /** @type {unknown} */ (Array)
    ),
    default: null,
  },
  commodity: {
    type: /** @type {import('vue').PropType<import('~~/shared/utils/constants.js').Commodity>} */ (
      String
    ),
    default: null,
  },
  modelValue: Boolean,
  /** Show a "Flächen ändern" button, which emits `edit`. */
  editable: Boolean,
  /** Text shown in a snackbar on the map until the user dismisses it. */
  hint: {
    type: String,
    default: null,
  },
});
const emit = defineEmits(['update:modelValue', 'edit']);

const mapContainer = ref(null);
const showHint = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      showHint.value = !!props.hint;
    }
  },
  { immediate: true },
);

const { data: userData } = await useFetch('/api/users/me');
const showOwnFields =
  !!userData.value?.lfbis && FIELDS_LOGIN_PROVIDERS.includes(userData.value.loginProvider);
const fields = showOwnFields ? (await useFetch('/api/lfbis?layer=fields')).data.value : undefined;
const farms = showOwnFields ? (await useFetch('/api/lfbis?layer=farms')).data.value : undefined;
const fieldsExtent = showOwnFields ? (await useFetch('/api/lfbis-extent')).data.value : undefined;

const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });
const geolocationSource = new VectorSource();

watch(
  () => props.geojson,
  (geojson) => {
    geolocationSource.clear();
    if (geojson) {
      geolocationSource.addFeatures(geojsonFormat.readFeatures(geojson));
    }
  },
  { immediate: true },
);

const geolocationLayer = new VectorLayer({ source: geolocationSource });

/** @type {import('vue').ShallowRef<import('ol/layer/Group.js').default|null>} */
const commodityLayer = shallowRef(null);

const map = new Map({
  layers: [createBackgroundKatasterLayer()],
  view: new View(),
});

watch(
  () => props.commodity,
  (newValue) => {
    if (commodityLayer.value) {
      map.removeLayer(commodityLayer.value);
      map.removeLayer(geolocationLayer);
    }
    if (newValue) {
      const { layerGroup } = createCommodityLayerset(newValue, farms, fields, { ownOnly: true });
      commodityLayer.value = layerGroup;
      map.addLayer(commodityLayer.value);
      map.addLayer(geolocationLayer);
    }
  },
  { immediate: true },
);

async function fitMap() {
  await nextTick();
  if (mapContainer.value) {
    map.setTarget(mapContainer.value);
    map.updateSize();
    const geojsonExtent = geolocationSource.getExtent();
    const hasGeojsonExtent = geojsonExtent && Number.isFinite(geojsonExtent[0]);
    const fallbackExtent = props.extent ?? fieldsExtent;
    if (hasGeojsonExtent) {
      map.getView().fit(geojsonExtent, { padding: [20, 20, 20, 20], maxZoom: 18 });
    } else if (fallbackExtent) {
      map.getView().fit(transformExtent(fallbackExtent, 'EPSG:4326', 'EPSG:3857'), {
        padding: [20, 20, 20, 20],
        maxZoom: 16,
      });
    } else {
      map.getView().fit(austriaExtent, { padding: [20, 20, 20, 20], maxZoom: 10 });
    }
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    @update:model-value="emit('update:modelValue', $event)"
    @after-enter="fitMap"
  >
    <v-card>
      <v-card-title>
        <v-toolbar color="transparent" flat density="compact">
          Lokalisierungen
          <v-spacer />
          <v-btn
            :icon="mdiClose"
            variant="text"
            size="small"
            @click="emit('update:modelValue', false)"
          />
        </v-toolbar>
      </v-card-title>
      <v-card-text class="pa-0 position-relative">
        <div ref="mapContainer" style="height: 500px" />
        <!-- Reset the app layout's offsets, which would shift the snackbar by the size of the
             app's bars, and the 344px min-width, which is wider than the dialog on small phones. -->
        <v-snackbar
          v-model="showHint"
          contained
          timeout="-1"
          min-width="0"
          style="
            --v-layout-top: 0px;
            --v-layout-bottom: 0px;
            --v-layout-left: 0px;
            --v-layout-right: 0px;
          "
        >
          {{ hint }}
          <template #actions>
            <v-btn variant="text" @click="showHint = false">OK</v-btn>
          </template>
        </v-snackbar>
      </v-card-text>
      <v-card-actions v-if="editable">
        <v-spacer />
        <v-btn variant="outlined" :prepend-icon="mdiPencilOutline" @click="emit('edit')">
          Flächen ändern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
