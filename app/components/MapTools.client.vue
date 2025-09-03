<script setup>
import {
  mdiEarthArrowDown,
  //mdiEarthArrowUp,
  mdiVectorSquareEdit,
  mdiVectorSquarePlus,
  mdiVectorSquareRemove,
} from '@mdi/js';
import Modify from 'ol/interaction/Modify';
import Map from 'ol/Map.js';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON.js';

const props = defineProps({
  map: {
    type: Map,
    required: true,
  },
  geolocationSource: {
    type: /** @type {PropType<VectorSource>} */ (VectorSource),
    required: true,
  },
  getFeatureAtPixel: {
    type: /** @type {PropType<import('~/utils/layers-sources.client.js').GetFeatureAtPixel|(() => void)>} */ (
      Function
    ),
    required: true,
  },
  commodity: {
    type: String,
    required: true,
  },
});

const mapMode = ref(0);

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
async function addFeature(event) {
  if (mapMode.value !== 0) {
    return;
  }
  const feature = await props.getFeatureAtPixel(props.map, event.pixel);
  if (!feature) {
    return;
  }
  const source = props.geolocationSource;
  if (!source) {
    console.error('No source in geolocation layer');
    return;
  }
  source.addFeature(feature);
}

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
function deleteFeature(event) {
  const feature =
    /** @type {import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>} */ (
      props.map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
        layerFilter: (l) => l.getSource() === props.geolocationSource,
      })
    );
  if (feature) {
    const source = props.geolocationSource;
    if (!source) {
      console.error('No source in geolocation layer');
      return;
    }
    source.removeFeature(feature);
  }
}

const edit = new Modify({
  source: props.geolocationSource,
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

function saveGeoJSON() {
  const features = props.geolocationSource.getFeatures();
  const geojson = new GeoJSON().writeFeatures(features, {
    featureProjection: props.map.getView().getProjection(),
  });
  const link = document.createElement('a');
  link.setAttribute('type', 'hidden');
  link.href = 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(geojson);
  link.download = `eudr_${props.commodity}_${new Date().toISOString().slice(0, 10)}.geojson`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
</script>

<template>
  <v-btn-toggle v-model="mapMode">
    <v-tooltip open-on-click>
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquarePlus" v-bind="on" />
      </template>
      Ort hinzufügen
    </v-tooltip>
    <v-tooltip open-on-click>
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquareEdit" v-bind="on" />
      </template>
      Ort bearbeiten
    </v-tooltip>
    <v-tooltip open-on-click>
      <template #activator="{ props: on }">
        <v-btn :icon="mdiVectorSquareRemove" v-bind="on" />
      </template>
      Ort entfernen
    </v-tooltip>
  </v-btn-toggle>
  <!--v-tooltip open-on-click>
    <template #activator="{ props: on }">
      <v-btn :icon="mdiEarthArrowUp" v-bind="on" />
    </template>
    GeoJSON laden
  </v-tooltip-->
  <v-tooltip open-on-click>
    <template #activator="{ props: on }">
      <v-btn :icon="mdiEarthArrowDown" v-bind="on" @click="saveGeoJSON" />
    </template>
    GeoJSON speichern
  </v-tooltip>
</template>
