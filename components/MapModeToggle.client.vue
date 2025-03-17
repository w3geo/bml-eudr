<script setup>
import { mdiVectorSquareEdit, mdiVectorSquarePlus, mdiVectorSquareRemove } from '@mdi/js';
import Modify from 'ol/interaction/Modify';
import Map from 'ol/Map.js';

const props = defineProps({
  commodity: {
    type: /** @type {import('vue').PropType<import('~/utils/constants.js').Commodity>} */ (String),
    required: true,
  },
  map: {
    type: Map,
    required: true,
  },
});

const showTooltipAdd = ref(false);
const showTooltipEdit = ref(false);
const showTooltipRemove = ref(false);
const mapMode = ref(0);

const { geolocationLayer, geolocationSource } = useStatement(props.commodity);

const { getFeatureAtPixel } = usePlaces(props.commodity);

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
async function addFeature(event) {
  if (mapMode.value !== 0) {
    return;
  }
  const feature = await getFeatureAtPixel(props.map, event.pixel);
  geolocationSource.addFeature(feature);
}

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
function deleteFeature(event) {
  const feature =
    /** @type {import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>} */ (
      props.map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
        layerFilter: (l) => l === geolocationLayer,
      })
    );
  if (feature) {
    geolocationSource.removeFeature(feature);
  }
}

const edit = new Modify({
  source: geolocationSource,
});

watch(
  mapMode,
  (value) => {
    const map = props.map;
    if (value === 0) {
      map.on('click', addFeature);
    } else {
      map.un('click', addFeature);
    }
    if (value === 1) {
      map.addInteraction(edit);
    } else {
      map.removeInteraction(edit);
    }
    if (value === 2) {
      map.on('click', deleteFeature);
    } else {
      map.un('click', deleteFeature);
    }
  },
  { immediate: true },
);
</script>

<template>
  <v-btn-toggle v-model="mapMode">
    <v-tooltip
      v-model="showTooltipAdd"
      density="compact"
      open-on-click
      text="Ort hinzufügen"
      bottom
      @lick:outside="showTooltipAdd = false"
    >
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquarePlus" v-bind="on" />
      </template>
    </v-tooltip>
    <v-tooltip
      v-model="showTooltipEdit"
      density="compact"
      open-on-click
      text="Ort bearbeiten"
      bottom
      @click:outside="showTooltipEdit = false"
    >
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquareEdit" v-bind="on" />
      </template>
    </v-tooltip>
    <v-tooltip
      v-model="showTooltipRemove"
      open-on-click
      text="Ort entfernen"
      bottom
      @click:outside="showTooltipRemove = false"
    >
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquareRemove" v-bind="on" />
      </template> </v-tooltip
  ></v-btn-toggle>
</template>
