<script setup>
import { PlaceSearch, usePlaceSearch } from '@w3geo/vue-place-search';
import Map from 'ol/Map';
import 'ol/ol.css';
import LayerGroup from 'ol/layer/Group';
import {
  addMapboxLayer,
  apply,
  getLayer,
  getMapboxLayer,
  updateMapboxLayer,
} from 'ol-mapbox-style';
import { register as registerPMTiles } from 'pmtiles-protocol';
import { fromLonLat, getPointResolution } from 'ol/proj';
import { mdiVectorSquareEdit, mdiVectorSquarePlus, mdiVectorSquareRemove } from '@mdi/js';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import { fromExtent } from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { getArea } from 'ol/sphere';

const { geolocation } = useStatement();

const mapContainer = ref();
const showTooltipAdd = ref(false);
const showTooltipEdit = ref(false);
const showTooltipRemove = ref(false);
const mapMode = ref(0);

registerPMTiles();

const agraratlas = new LayerGroup();
apply(agraratlas, 'https://agraratlas.inspire.gv.at/map/style-pmtiles.json').then(() => {
  const schlaege = getMapboxLayer(agraratlas, 'invekos_schlaege_polygon-fill');
  addMapboxLayer(
    agraratlas,
    {
      ...schlaege,
      id: 'invekos_schlaege_polygon-soy-fill',
      filter: ['==', 'snar_bezeichnung', 'SOJABOHNEN'],
      paint: {
        ...schlaege.paint,
        'fill-color': 'rgba(255, 255, 0, 0.5)',
      },
    },
    'invekos_schlaege_polygon-fill',
  );
  updateMapboxLayer(agraratlas, {
    ...schlaege,
    filter: ['!=', 'snar_bezeichnung', 'SOJABOHNEN'],
  });
});

const kataster = new LayerGroup({
  visible: false,
  minZoom: 16,
  maxZoom: 18,
});
apply(kataster, 'https://kataster.bev.gv.at/styles/kataster/style_basic.json');

/** @type {VectorSource<Feature<import('ol/geom/Polygon.js').default>>} */
const geolocationSource = new VectorSource();

/**
 * @param {import('ol/source/Vector.js').VectorSourceEvent} e
 */
function calculateArea(e) {
  const feature = e.feature;
  if (!feature) {
    return;
  }
  const geometry = feature.getGeometry();
  if (!geometry || !geometry.getType().endsWith('Polygon')) {
    return;
  }
  feature.set(
    'Area',
    feature.get('sl_flaeche_brutto_ha') || getArea(geometry, { projection: 'EPSG:3857' }) / 10000,
  );
}

function updateGeolocation() {
  const features = geolocationSource.getFeatures();
  geolocation.value = geojsonFormat.writeFeaturesObject(features);
}

geolocationSource.on('addfeature', calculateArea);
geolocationSource.on('changefeature', calculateArea);
geolocationSource.on('change', updateGeolocation);
const geolocationLayer = new VectorLayer({
  source: geolocationSource,
});

const map = new Map({
  target: mapContainer.value,
  layers: [kataster, agraratlas, geolocationLayer],
});

/** @type {GeoJSON<Feature<import('ol/geom/Polygon.js').default>>} */
const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
async function addFeature(event) {
  if (mapMode.value !== 0) {
    return;
  }
  const layer = getLayer(agraratlas, 'invekos_schlaege_polygon-fill');
  const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
    layerFilter: (l) => l === layer,
  });
  if (feature) {
    const meta = agraratlas.get('mapbox-style').metadata;
    const template = meta.sources['invekos_schlaege_polygon'].featureUrlTemplate;
    const featureUrl = template.replace('{localID}', feature.get('localID'));
    try {
      /** @type {ReturnType<typeof $fetch<import('geojson').FeatureCollection<import('geojson').Polygon|import('geojson').MultiPolygon>>>} */
      const featureData = $fetch(featureUrl);
      const geojson = await featureData;
      if (!geojson || !geojson.features.length) {
        return;
      }
      geolocationSource.addFeatures(geojsonFormat.readFeatures(geojson));
    } catch {
      //TODO show dialog
    }
  } else {
    const center = event.coordinate;
    const resolution = getPointResolution(
      'EPSG:3857',
      map.getView().getResolution() || 1,
      center,
      'm',
    );
    const extent = [
      center[0] - resolution * 50,
      center[1] - resolution * 50,
      center[0] + resolution * 50,
      center[1] + resolution * 50,
    ];
    geolocationSource.addFeature(new Feature(fromExtent(extent)));
  }
}

/**
 * @param {import('ol/MapBrowserEvent.js').default<*>} event
 */
function deleteFeature(event) {
  const feature =
    /** @type {import('ol/Feature.js').default<import('ol/geom/Polygon.js').default>} */ (
      map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
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

usePlaceSearch(map);

const extent = [...fromLonLat([9.530952, 46.372276]), ...fromLonLat([17.160776, 49.020608])];
onMounted(async () => {
  await nextTick();
  map.setTarget(mapContainer.value);
  map.getView().fit(extent, { size: map.getSize(), maxZoom: 10, padding: [20, 20, 20, 20] });
  mapContainer.value.classList.add('spinner');
  const userData = await $fetch('/api/users/me');
  const address = userData?.address;
  if (address) {
    const value = address.split(', ').reverse().join(' ');
    const animation = { center: fromLonLat([16.3738, 48.2082]), zoom: 13, duration: 500 };
    try {
      /** @type {ReturnType<typeof $fetch<{data: import('geojson').FeatureCollection<import('geojson').Point>}>>} */
      const locationData = $fetch(
        `https://kataster.bev.gv.at/api/search/?layers=pg-adr-gn-rn-gst-kg-bl&term=${encodeURIComponent(value)}`,
      );
      const { features } = (await locationData).data;
      if (features.length && features[0].geometry.type === 'Point') {
        const [feature] = features;
        animation.center = fromLonLat(feature.geometry.coordinates);
        animation.zoom = 16;
      }
    } finally {
      map.getView().animate(animation);
      map.once('rendercomplete', () => {
        mapContainer.value.classList.remove('spinner');
      });
    }
  }
});
</script>

<template>
  <v-layout class="d-flex fill-height">
    <v-app-bar color="settings.$toolbar-color" density="compact" flat class="pr-1">
      <div>
        <v-btn-toggle v-model="mapMode">
          <v-tooltip
            v-model="showTooltipAdd"
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
      </div>
      <v-spacer />
      <div>
        <place-search />
      </div>
    </v-app-bar>
    <v-main>
      <div ref="mapContainer" class="map" />
    </v-main>
  </v-layout>
</template>

<style scoped>
.map {
  height: 100%;
  width: 100%;
}
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.spinner:after {
  content: '';
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  margin-left: -20px;
  border-radius: 50%;
  border: 5px solid rgba(180, 180, 180, 0.6);
  border-top-color: rgba(0, 0, 0, 0.6);
  animation: spinner 0.6s linear infinite;
}
</style>
