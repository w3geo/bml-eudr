<script setup>
import {
  mdiEarthArrowDown,
  mdiEarthArrowUp,
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
const fileUpload = ref(false);
const file = ref(null);
/** @type {Ref<import('vuetify/components').VForm|undefined>} */
const fileForm = ref();

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

/**
 * @param {Promise<any>} event Submit event
 */
async function loadGeoJSON(event) {
  const result = await event;
  if (!result.valid) {
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = (event) => {
    const geojson = event.target?.result;
    try {
      const features = new GeoJSON().readFeatures(geojson, {
        featureProjection: props.map.getView().getProjection(),
      });
      props.geolocationSource.addFeatures(features);
      props.map.getView().fit(props.geolocationSource.getExtent(), {
        size: props.map.getSize(),
        maxZoom: 15,
        padding: [20, 20, 20, 20],
        duration: 500,
      });
      file.value = null;
      fileUpload.value = false;
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      file.value = null;
      fileUpload.value = false;
    }
  };
  if (!file.value) {
    fileUpload.value = false;
    return;
  }
  fileReader.readAsText(file.value);
}

/**
 * @param {File} file
 * @returns {Promise<string|boolean>}
 */
function checkFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      return resolve('Datei ist erforderlich');
    }
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      const result = event.target?.result;
      if (!result || typeof result !== 'string') {
        return resolve('Ungültige Datei');
      }
      try {
        JSON.parse(result);
        return resolve(true);
      } catch {
        return resolve('Ungültige GeoJSON Datei');
      }
    };
    fileReader.readAsText(file);
  });
}
</script>

<template>
  <v-dialog v-model="fileUpload" max-width="400">
    <v-form ref="fileForm" @submit.prevent="loadGeoJSON" @reset="file = null">
      <v-card>
        <v-card-title>GeoJSON laden</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="file"
            :show-size="true"
            accept=".json,.geojson,application/json,application/geo.json"
            :multiple="false"
            density="compact"
            variant="outlined"
            label="GeoJSON Datei (WGS84)"
            :rules="[checkFile]"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn type="submit">Laden</v-btn>
          <v-btn type="reset" @click="fileUpload = false">Abbrechen</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
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
  <v-tooltip open-on-click>
    <template #activator="{ props: on }">
      <v-btn :icon="mdiEarthArrowUp" v-bind="on" @click="fileUpload = true" />
    </template>
    GeoJSON laden
  </v-tooltip>
  <v-tooltip open-on-click>
    <template #activator="{ props: on }">
      <v-btn :icon="mdiEarthArrowDown" v-bind="on" @click="saveGeoJSON" />
    </template>
    GeoJSON speichern
  </v-tooltip>
</template>
