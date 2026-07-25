<script setup>
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map.js';
import 'ol/ol.css';
import VectorSource from 'ol/source/Vector.js';
import { View } from 'ol';
import { fromLonLat, transformExtent } from 'ol/proj';

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
});
const emit = defineEmits(['update:modelValue']);

const mapContainer = ref(null);

const fields = (await useFetch('/api/lfbis?layer=fields')).data.value;
const farms = (await useFetch('/api/lfbis?layer=farms')).data.value;
const fieldsExtent = (await useFetch('/api/lfbis-extent')).data.value;

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
      const { layerGroup } = createCommodityLayerset(newValue, farms, fields);
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
      <v-card-title>Erzeugungsorte</v-card-title>
      <v-card-text class="pa-0">
        <div ref="mapContainer" style="height: 500px" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="emit('update:modelValue', false)">Schließen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
